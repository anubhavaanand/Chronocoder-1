"""
Session & Message models + repository layer for Supabase.
"""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field
from supabase import create_client, Client
import os


class SessionCreate(BaseModel):
    mentor_id: str
    user_code: str
    language: str = "python"
    complexity_score: Optional[int] = None


class SessionUpdate(BaseModel):
    status: Optional[str] = None
    complexity_score: Optional[int] = None
    completed_at: Optional[datetime] = None


class Session(BaseModel):
    id: UUID
    user_id: UUID
    mentor_id: str
    user_code: str
    language: str
    complexity_score: Optional[int] = None
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class MessageCreate(BaseModel):
    session_id: UUID
    role: str  # 'user' | 'assistant' | 'system' | 'analysis'
    content: dict  # structured JSON
    sequence: int


class Message(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: dict
    sequence: int
    created_at: datetime


class SessionRepository:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE key required")
        self.client: Client = create_client(url, key)

    # --- Sessions ---
    async def create_session(self, user_id: UUID, data: SessionCreate) -> Session:
        payload = data.model_dump()
        payload["user_id"] = str(user_id)
        result = self.client.table("sessions").insert(payload).execute()
        return Session(**result.data[0])

    async def get_session(self, session_id: UUID, user_id: UUID) -> Optional[Session]:
        result = self.client.table("sessions").select("*").eq("id", str(session_id)).eq("user_id", str(user_id)).single().execute()
        if result.data:
            return Session(**result.data)
        return None

    async def list_sessions(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[Session]:
        result = self.client.table("sessions").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return [Session(**row) for row in result.data]

    async def update_session(self, session_id: UUID, user_id: UUID, data: SessionUpdate) -> Optional[Session]:
        payload = data.model_dump(exclude_unset=True)
        payload["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table("sessions").update(payload).eq("id", str(session_id)).eq("user_id", str(user_id)).execute()
        if result.data:
            return Session(**result.data[0])
        return None

    async def complete_session(self, session_id: UUID, user_id: UUID) -> Optional[Session]:
        return await self.update_session(session_id, user_id, SessionUpdate(status="completed", completed_at=datetime.utcnow()))

    # --- Messages ---
    async def add_message(self, data: MessageCreate) -> Message:
        payload = data.model_dump()
        payload["session_id"] = str(data.session_id)
        result = self.client.table("messages").insert(payload).execute()
        return Message(**result.data[0])

    async def get_messages(self, session_id: UUID, user_id: UUID) -> List[Message]:
        # Verify session belongs to user first
        session = await self.get_session(session_id, user_id)
        if not session:
            return []
        result = self.client.table("messages").select("*").eq("session_id", str(session_id)).order("sequence").execute()
        return [Message(**row) for row in result.data]

    async def get_last_sequence(self, session_id: UUID) -> int:
        result = self.client.table("messages").select("sequence").eq("session_id", str(session_id)).order("sequence", desc=True).limit(1).execute()
        if result.data:
            return result.data[0]["sequence"]
        return 0


# Singleton instance
_session_repo: Optional[SessionRepository] = None


def get_session_repo() -> SessionRepository:
    global _session_repo
    if _session_repo is None:
        _session_repo = SessionRepository()
    return _session_repo