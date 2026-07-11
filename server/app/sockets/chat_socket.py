"""
Real-time chat via python-socketio.

Room naming: each accepted interest gets its own room keyed by interest_id.
Room name: "room:{interest_id}"

Socket.IO auth handshake: the client must pass the JWT in the `auth` dict:
    socket = io("http://localhost:8000", { auth: { token: "<jwt>" } })

On connect, the server validates the token and refuses connection if invalid.
"""
import socketio
from jose import JWTError

from app.core.security import decode_access_token
from app.utils.logger import logger

# Async Socket.IO server — CORS origins are controlled by FastAPI middleware,
# but socketio also needs to allow the same origin.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="settings.get_cors_origins()",   # FastAPI CORS handles the real restriction
    logger=True,
    engineio_logger=True,
)


# ── Connection lifecycle ───────────────────────────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: dict | None):
    """
    Validate the JWT before accepting the socket connection.

    The client must pass: { auth: { token: "<jwt>" } }
    Returning False disconnects the client immediately.
    """
    if not auth:
        logger.warning(f"Socket connect rejected (no auth payload): sid={sid}")
        return False

    # Extract the token — handle both string and accidentally-nested dict
    raw = auth.get("token") if isinstance(auth, dict) else None

    # Unwrap if the client mistakenly sent { token: { token: "..." } }
    if isinstance(raw, dict):
        raw = raw.get("token")

    if not isinstance(raw, str) or not raw.strip():
        logger.warning(f"Socket connect rejected (missing/invalid token): sid={sid}")
        return False

    try:
        payload = decode_access_token(raw)
        user_id = payload["sub"]
        await sio.save_session(sid, {"user_id": user_id, "role": payload.get("role")})
        logger.info(f"Socket connected: sid={sid}, user_id={user_id}")
    except (JWTError, KeyError) as exc:
        logger.warning(f"Socket connect rejected (invalid token): sid={sid} — {exc}")
        return False


@sio.event
async def disconnect(sid: str):
    logger.info(f"Socket disconnected: sid={sid}")


# ── Room management ────────────────────────────────────────────────────────────

@sio.event
async def join_room(sid: str, data: dict):
    """
    Join the chat room for an accepted interest.

    Expected payload: { "interest_id": "<id>" }

    Validates that:
    1. The interest exists and is accepted.
    2. The requesting user is either the tenant or the listing owner.
    """
    interest_id = data.get("interest_id")
    if not interest_id:
        await sio.emit("error", {"message": "interest_id required"}, to=sid)
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id")

    # Lazy imports to avoid circular dependency at module load time
    from app.models.interest import Interest, InterestStatus
    from app.models.listing import Listing

    interest = await Interest.get(interest_id)
    if not interest:
        await sio.emit("error", {"message": "Interest not found"}, to=sid)
        return

    if interest.status != InterestStatus.accepted:
        await sio.emit("error", {"message": "Chat only available for accepted interests"}, to=sid)
        return

    listing = await Listing.get(interest.listing_id)
    is_participant = (
        interest.tenant_id == user_id or (listing and listing.owner_id == user_id)
    )
    if not is_participant:
        await sio.emit("error", {"message": "Not a participant in this chat"}, to=sid)
        return

    room = f"room:{interest_id}"
    await sio.enter_room(sid, room)                            # 👈 added await
    logger.info(f"sid={sid} joined {room}")
    await sio.emit("joined", {"room": room}, to=sid)


@sio.event
async def leave_room(sid: str, data: dict):
    interest_id = data.get("interest_id")
    if interest_id:
        room = f"room:{interest_id}"
        await sio.leave_room(sid, room)                        # 👈 added await
        logger.info(f"sid={sid} left {room}")


# ── Messaging ──────────────────────────────────────────────────────────────────

@sio.event
async def send_message(sid: str, data: dict):
    """
    Receive a message, persist it, broadcast to the room.

    Expected payload: { "interest_id": "<id>", "content": "<text>" }
    """
    interest_id = data.get("interest_id")
    content = data.get("content", "").strip()

    if not interest_id or not content:
        await sio.emit("error", {"message": "interest_id and content required"}, to=sid)
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id")

    from app.models.interest import Interest, InterestStatus
    from app.models.listing import Listing
    from app.models.message import Message

    interest = await Interest.get(interest_id)
    if not interest or interest.status != InterestStatus.accepted:
        await sio.emit("error", {"message": "Cannot send message — interest not accepted"}, to=sid)
        return

    listing = await Listing.get(interest.listing_id)
    is_participant = (
        interest.tenant_id == user_id or (listing and listing.owner_id == user_id)
    )
    if not is_participant:
        await sio.emit("error", {"message": "Not a participant"}, to=sid)
        return

    # Persist the message
    msg = Message(
        interest_id=interest_id,
        sender_id=user_id,
        content=content,
    )
    await msg.insert()

    payload = {
        "id": str(msg.id),
        "interest_id": interest_id,
        "sender_id": user_id,
        "content": content,
        "created_at": msg.created_at.isoformat(),
    }

    # Emit to everyone in the room (including sender for confirmation)
    room = f"room:{interest_id}"
    await sio.emit("new_message", payload, room=room)
    logger.info(f"Message persisted and emitted: room={room}, sender={user_id}")