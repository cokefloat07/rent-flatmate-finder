"""
Real-time chat via python-socketio.

Room naming: each accepted interest gets its own room keyed by interest_id.
Room name: "room:{interest_id}"
"""
import socketio
from jose import JWTError

from app.core.security import decode_access_token
from app.utils.logger import logger

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
)

# ── Connection lifecycle ───────────────────────────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: dict | None):
    if not auth:
        logger.warning(f"Socket connect rejected (no auth payload): sid={sid}")
        return False

    raw = auth.get("token") if isinstance(auth, dict) else None

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
    Join chat room.
    - Accepted status → full read/write access
    - Revoked status → read-only access (view history only)
    """
    interest_id = data.get("interest_id")
    if not interest_id:
        await sio.emit("error", {"message": "interest_id required"}, to=sid)
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id")

    from app.models.interest import Interest, InterestStatus
    from app.models.listing import Listing

    interest = await Interest.get(interest_id)
    if not interest:
        await sio.emit("error", {"message": "Interest not found"}, to=sid)
        return

    # Allow both accepted (full access) and revoked (read-only)
    if interest.status not in (InterestStatus.accepted, InterestStatus.revoked):
        await sio.emit(
            "error",
            {"message": f"Chat not available (status: {interest.status.value})"},
            to=sid,
        )
        return

    listing = await Listing.get(interest.listing_id)
    is_participant = (
        interest.tenant_id == user_id or (listing and listing.owner_id == user_id)
    )
    if not is_participant:
        await sio.emit("error", {"message": "Not a participant in this chat"}, to=sid)
        return

    room = f"room:{interest_id}"
    await sio.enter_room(sid, room)
    logger.info(f"sid={sid} joined {room} (status={interest.status.value})")

    is_read_only = interest.status == InterestStatus.revoked
    await sio.emit(
        "joined",
        {
            "room": room,
            "read_only": is_read_only,
            "status": interest.status.value,
        },
        to=sid,
    )


@sio.event
async def leave_room(sid: str, data: dict):
    interest_id = data.get("interest_id")
    if interest_id:
        room = f"room:{interest_id}"
        await sio.leave_room(sid, room)
        logger.info(f"sid={sid} left {room}")


# ── Messaging ──────────────────────────────────────────────────────────────────

@sio.event
async def send_message(sid: str, data: dict):
    """
    Send a message. Only allowed if interest.status == 'accepted'.
    Revoked chats are read-only.
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
    if not interest:
        await sio.emit("error", {"message": "Interest not found"}, to=sid)
        return

    if interest.status == InterestStatus.revoked:
        await sio.emit(
            "error",
            {"message": "Chat access has been revoked. You can only view history."},
            to=sid,
        )
        return

    if interest.status != InterestStatus.accepted:
        await sio.emit(
            "error",
            {"message": "Cannot send message — interest not accepted"},
            to=sid,
        )
        return

    listing = await Listing.get(interest.listing_id)
    is_participant = (
        interest.tenant_id == user_id or (listing and listing.owner_id == user_id)
    )
    if not is_participant:
        await sio.emit("error", {"message": "Not a participant"}, to=sid)
        return

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

    room = f"room:{interest_id}"
    await sio.emit("new_message", payload, room=room)
    logger.info(f"Message persisted and emitted: room={room}, sender={user_id}")