"""
WebSocket Connection Manager
Manages multiple client connections for real-time streaming
"""

import asyncio
import logging
from typing import Set, Optional
from fastapi import WebSocket

from backend.utils.env import env_int

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Handles WebSocket connections for live feedback streaming safely under concurrency (#CC-015, #CC-017)"""

    def __init__(self, max_connections: Optional[int] = None):
        self.active_connections: Set[WebSocket] = set()
        env_limit = env_int("MAX_WS_CONNECTIONS", 1000)
        self.max_connections = max_connections if max_connections is not None else env_limit
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> bool:
        """Accept new WebSocket connection if within capacity, otherwise close with code 1013 (#CC-017)."""
        async with self._lock:
            if len(self.active_connections) >= self.max_connections:
                await websocket.close(code=1013, reason="Server busy: max connections reached")
                return False

            await websocket.accept()
            self.active_connections.add(websocket)
            return True

    def disconnect(self, websocket: WebSocket):
        """Remove closed connection"""
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients without mutation race conditions"""
        async with self._lock:
            connections_snapshot = list(self.active_connections)

        disconnected = set()
        for connection in connections_snapshot:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        # Clean up disconnected clients safely
        if disconnected:
            async with self._lock:
                self.active_connections -= disconnected

    async def send_to_client(self, websocket: WebSocket, message: dict):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending to client: {e}")
            self.disconnect(websocket)

    async def send_heartbeat(self, websocket: WebSocket) -> bool:
        """Send a heartbeat ping frame to a specific client, returning False if disconnected (#CC-016)."""
        try:
            await websocket.send_json({"type": "ping"})
            return True
        except Exception:
            self.disconnect(websocket)
            return False

    async def broadcast_heartbeat(self) -> int:
        """Broadcast a heartbeat ping to all active clients, pruning dead connections. Returns active count (#CC-016)."""
        await self.broadcast({"type": "ping"})
        return self.client_count

    @property
    def client_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
