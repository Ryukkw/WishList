"""
WebSocket connection manager for wishlist realtime updates.
Tracks connections per slug and broadcasts events to all viewers of a list.
"""
import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # slug -> set of WebSocket
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, slug: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[slug].add(websocket)
        logger.info("WS connect slug=%s connections=%d", slug, len(self._rooms[slug]))

    def disconnect(self, slug: str, websocket: WebSocket) -> None:
        self._rooms[slug].discard(websocket)
        if not self._rooms[slug]:
            del self._rooms[slug]
        logger.info("WS disconnect slug=%s", slug)

    async def broadcast(self, slug: str, message: dict) -> None:
        if slug not in self._rooms:
            return
        payload = json.dumps(message, ensure_ascii=False)
        dead: list[WebSocket] = []
        for ws in self._rooms[slug]:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning("WS send error: %s", e)
                dead.append(ws)
        for ws in dead:
            self._rooms[slug].discard(ws)


# Singleton used by routers to broadcast
manager = ConnectionManager()
