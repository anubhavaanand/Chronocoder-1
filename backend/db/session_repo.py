"""
Session & Message models + repository layer for Supabase.
"""
import asyncio
from datetime import datetime
import os
from typing import Any, List, Optional, Union
import uuid
from uuid import UUID

from pydantic import BaseModel, field_validator
from supabase import create_client, Client

ANONYMOUS_NAMESPACE = uuid.NAMESPACE_DNS


def coerce_uuid(val: Any) -> UUID:
    """
    Safely coerce a UUID or arbitrary string (e.g. 'anonymous', custom id, or None)
    into a deterministic UUID (#CC-026).
    """
    if isinstance(val, UUID):
        return val
    if val is None or str(val).strip() in ("", "anonymous", "anon", "guest"):
        return uuid.uuid5(ANONYMOUS_NAMESPACE, "anonymous")
    try:
        return UUID(str(val))
    except (ValueError, TypeError, AttributeError):
        return uuid.uuid5(ANONYMOUS_NAMESPACE, f"anonymous.{val}")


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

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v: Any) -> UUID:
        return coerce_uuid(v)

    @field_validator("user_id", mode="before")
    @classmethod
    def validate_user_id(cls, v: Any) -> UUID:
        return coerce_uuid(v)


class MessageCreate(BaseModel):
    session_id: UUID
    role: str  # 'user' | 'assistant' | 'system' | 'analysis'
    content: dict  # structured JSON
    sequence: int

    @field_validator("session_id", mode="before")
    @classmethod
    def validate_session_id(cls, v: Any) -> UUID:
        return coerce_uuid(v)


class Message(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: dict
    sequence: int
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def validate_id(cls, v: Any) -> UUID:
        return coerce_uuid(v)

    @field_validator("session_id", mode="before")
    @classmethod
    def validate_session_id(cls, v: Any) -> UUID:
        return coerce_uuid(v)


class SessionRepository:
    def __init__(self, client: Optional[Client] = None):
        if client is not None:
            self.client = client
            return
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE key required")
        self.client: Client = create_client(url, key)

    @staticmethod
    async def _execute(query: Any) -> Any:
        """
        Execute a blocking Supabase/PostgREST query in a worker threadpool
        via asyncio.to_thread so that the main asyncio event loop is not blocked (#CC-025).
        """
        return await asyncio.to_thread(query.execute)

    # --- Sessions ---
    async def create_session(self, user_id: Union[UUID, str], data: SessionCreate) -> Session:
        u_id = coerce_uuid(user_id)
        payload = data.model_dump()
        payload["user_id"] = str(u_id)
        query = self.client.table("sessions").insert(payload)
        result = await self._execute(query)
        return Session(**result.data[0])

    async def get_session(self, session_id: Union[UUID, str], user_id: Union[UUID, str]) -> Optional[Session]:
        s_id = coerce_uuid(session_id)
        u_id = coerce_uuid(user_id)
        query = (
            self.client.table("sessions")
            .select("*")
            .eq("id", str(s_id))
            .eq("user_id", str(u_id))
            .single()
        )
        result = await self._execute(query)
        if result.data:
            return Session(**result.data)
        return None

    async def list_sessions(
        self, user_id: Union[UUID, str], limit: int = 20, offset: int = 0
    ) -> List[Session]:
        u_id = coerce_uuid(user_id)
        query = (
            self.client.table("sessions")
            .select("*")
            .eq("user_id", str(u_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        result = await self._execute(query)
        return [Session(**row) for row in result.data]

    async def update_session(
        self, session_id: Union[UUID, str], user_id: Union[UUID, str], data: SessionUpdate
    ) -> Optional[Session]:
        s_id = coerce_uuid(session_id)
        u_id = coerce_uuid(user_id)
        payload = data.model_dump(exclude_unset=True)
        payload["updated_at"] = datetime.utcnow().isoformat()
        query = (
            self.client.table("sessions")
            .update(payload)
            .eq("id", str(s_id))
            .eq("user_id", str(u_id))
        )
        result = await self._execute(query)
        if result.data:
            return Session(**result.data[0])
        return None

    async def complete_session(
        self, session_id: Union[UUID, str], user_id: Union[UUID, str]
    ) -> Optional[Session]:
        return await self.update_session(
            session_id, user_id, SessionUpdate(status="completed", completed_at=datetime.utcnow())
        )

    # --- Messages ---
    async def add_message(self, data: MessageCreate) -> Message:
        payload = data.model_dump()
        payload["session_id"] = str(data.session_id)
        query = self.client.table("messages").insert(payload)
        result = await self._execute(query)
        return Message(**result.data[0])

    async def get_messages(
        self, session_id: Union[UUID, str], user_id: Union[UUID, str]
    ) -> List[Message]:
        # Verify session belongs to user first
        session = await self.get_session(session_id, user_id)
        if not session:
            return []
        s_id = coerce_uuid(session_id)
        query = (
            self.client.table("messages")
            .select("*")
            .eq("session_id", str(s_id))
            .order("sequence")
        )
        result = await self._execute(query)
        return [Message(**row) for row in result.data]

    async def get_last_sequence(self, session_id: Union[UUID, str]) -> int:
        s_id = coerce_uuid(session_id)
        query = (
            self.client.table("messages")
            .select("sequence")
            .eq("session_id", str(s_id))
            .order("sequence", desc=True)
            .limit(1)
        )
        result = await self._execute(query)
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
