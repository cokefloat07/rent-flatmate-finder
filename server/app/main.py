from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.mongodb import connect_db, close_db
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health():
    return {"success": True, "data": {"status": "ok", "version": "1.0.0"}}


# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.routers import auth as auth_router
from app.api.routers import listings as listings_router
from app.api.routers import profiles as profiles_router
from app.api.routers import interests as interests_router
from app.api.routers import chat as chat_router
from app.api.routers import admin as admin_router

app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(listings_router.router, prefix="/api/listings", tags=["Listings"])
app.include_router(profiles_router.router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(interests_router.router, prefix="/api/interests", tags=["Interests"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["Chat"])
app.include_router(admin_router.router, prefix="/api/admin", tags=["Admin"])


# ── Socket.IO ──────────────────────────────────────────────────────────────────
from app.sockets.chat_socket import sio

# Wrap the FastAPI ASGI app inside the Socket.IO ASGI app.
# Uvicorn must target `socket_app`, not `app` directly.
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)