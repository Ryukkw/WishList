from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, wishlists, public, scrape, upload
from app.websocket import manager as ws_manager

app = FastAPI(title="WishList API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(wishlists.router)
app.include_router(public.router)
app.include_router(scrape.router)
app.include_router(upload.router)

# Ensure upload dirs exist and serve uploaded files
upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
(upload_dir / "avatars").mkdir(parents=True, exist_ok=True)
(upload_dir / "items").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/list/{slug}")
async def websocket_list(websocket: WebSocket, slug: str):
    await ws_manager.connect(slug, websocket)
    try:
        await websocket.send_json({"type": "connected", "slug": slug})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(slug, websocket)
