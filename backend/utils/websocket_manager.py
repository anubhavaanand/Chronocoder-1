"""
WebSocket Connection Manager
Manages multiple client connections for real-time streaming
"""

import asyncio
from typing import Set
from fastapi import WebSocket


class ConnectionManager:
    """Handles WebSocket connections for live feedback streaming safely under concurrency (#CC-015)"""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

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

    @property
    def client_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
