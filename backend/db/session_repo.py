"""
Session & Message models + repository layer for Supabase.
"""
import asyncio
from datetime import datetime, timezone
import logging
import os
from typing import Any, List, Optional, Union
import uuid
from uuid import UUID

from pydantic import BaseModel, field_validator
from supabase import create_client, Client

logger = logging.getLogger(__name__)

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
    updated_at: Optional[datetime] = None


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
    def __init__(
        self,
        client: Optional[Client] = None,
        *,
        use_service_role: bool = True,
        jwt_token: Optional[str] = None,
    ):
        self.jwt_token: Optional[str] = jwt_token
        self.is_service_role: bool = use_service_role

        if client is not None:
            self.client = client
            if jwt_token:
                self.set_auth(jwt_token)
            return

        url = os.getenv("SUPABASE_URL")
        if not url:
            raise RuntimeError("SUPABASE_URL required")

        if use_service_role:
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not key:
                anon_key = os.getenv("SUPABASE_ANON_KEY")
                if not anon_key:
                    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY required")
                logger.warning(
                    "SUPABASE_SERVICE_ROLE_KEY not configured; falling back to SUPABASE_ANON_KEY. "
                    "Unauthenticated writes may fail RLS policies without user context (#CC-031)."
                )
                key = anon_key
                self.is_service_role = False
        else:
            key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not key:
                raise RuntimeError("SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY required")

        self.client: Client = create_client(url, key)
        if jwt_token:
            self.set_auth(jwt_token)

    def set_auth(self, jwt_token: str) -> None:
        """Attach an authenticated user's JWT to postgrest headers to satisfy RLS (#CC-031)."""
        self.jwt_token = jwt_token
        if hasattr(self.client, "postgrest") and hasattr(self.client.postgrest, "auth"):
            self.client.postgrest.auth(jwt_token)

    @classmethod
    def create_admin(cls) -> "SessionRepository":
        """Instantiate an admin SessionRepository using SUPABASE_SERVICE_ROLE_KEY (#CC-031)."""
        return cls(use_service_role=True)

    @classmethod
    def create_for_user(cls, jwt_token: str) -> "SessionRepository":
        """Instantiate a client SessionRepository scoped to the authenticated user's JWT (#CC-031)."""
        return cls(use_service_role=False, jwt_token=jwt_token)

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
        try:
            query = (
                self.client.table("sessions")
                .select("*")
                .eq("id", str(s_id))
                .eq("user_id", str(u_id))
            )
            if hasattr(query, "limit"):
                query = query.limit(1)
            elif hasattr(query, "single"):
                query = query.single()

            result = await self._execute(query)
            if result and hasattr(result, "data") and result.data:
                data = result.data
                row = data[0] if isinstance(data, list) and len(data) > 0 else data
                if isinstance(row, dict):
                    return Session(**row)
            return None
        except Exception as e:
            err_str = str(e)
            if "PGRST116" in err_str or "0 rows" in err_str or "406" in err_str:
                return None
            raise

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
        update_data = data.model_copy()
        if update_data.updated_at is None:
            update_data.updated_at = datetime.now(timezone.utc)
        payload = update_data.model_dump(exclude_unset=True)
        query = (
            self.client.table("sessions")
            .update(payload)
            .eq("id", str(s_id))
            .eq("user_id", str(u_id))
        )
        result = await self._execute(query)
        if result and hasattr(result, "data") and result.data:
            return Session(**result.data[0])
        return None

    async def complete_session(
        self, session_id: Union[UUID, str], user_id: Union[UUID, str]
    ) -> Optional[Session]:
        return await self.update_session(
            session_id, user_id, SessionUpdate(status="completed", completed_at=datetime.now(timezone.utc))
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
            .order("sequence", desc=False)
        )
        result = await self._execute(query)
        if result and hasattr(result, "data") and result.data:
            return [Message(**row) for row in result.data if isinstance(row, dict)]
        return []

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
        if result and hasattr(result, "data") and result.data:
            first = result.data[0]
            if isinstance(first, dict) and "sequence" in first:
                return int(first["sequence"])
        return 0


# Singleton instance
_session_repo: Optional[SessionRepository] = None


def get_session_repo(jwt_token: Optional[str] = None) -> SessionRepository:
    global _session_repo
    if jwt_token:
        return SessionRepository.create_for_user(jwt_token)
    if _session_repo is None:
        _session_repo = SessionRepository.create_admin()
    return _session_repo
