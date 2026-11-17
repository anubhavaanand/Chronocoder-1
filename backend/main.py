"""
ChronoCoder v4 - Backend API
FastAPI Application Server with Supabase Auth + Structured AI Feedback
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from collections import OrderedDict
import asyncio
import ast
import ipaddress
import logging
import re
from datetime import datetime, timezone
from typing import Optional
import uuid
import os
from jose import jwt, JWTError
from supabase import create_client, Client

# Import services
from backend.services.ai_service import AIGateway
from backend.utils.websocket_manager import ConnectionManager
from backend.db.session_repo import SessionRepository, SessionCreate, coerce_uuid

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ChronoCoder API",
    version="4.0.0",
    description="AI-Powered Python Learning Platform Backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Global state
manager = ConnectionManager()
ai_gateway: Optional[AIGateway] = None
supabase: Optional[Client] = None
session_repo: Optional[SessionRepository] = None

# Supabase config
FASTAPI_ENV = os.getenv("FASTAPI_ENV", "development").lower()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Rate limiting
MAX_RATE_LIMIT_KEYS = int(os.getenv("MAX_RATE_LIMIT_KEYS", "10000"))
request_counts: OrderedDict[str, list[datetime]] = OrderedDict()
RATE_LIMIT = 30  # requests per minute


def get_supabase_client() -> Client:
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY required")
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return supabase


def get_session_repo() -> Optional[SessionRepository]:
    """Dependency provider returning SessionRepository if configured, or None in development."""
    global session_repo
    if session_repo is not None:
        return session_repo

    url = os.getenv("SUPABASE_URL", SUPABASE_URL)
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY)
    if not url or not key:
        current_env = os.getenv("FASTAPI_ENV", FASTAPI_ENV).lower()
        if current_env == "production":
            raise HTTPException(
                status_code=500,
                detail="Database service misconfigured: SUPABASE_URL and key required in production",
            )
        return None

    try:
        session_repo = SessionRepository()
        return session_repo
    except Exception as e:
        current_env = os.getenv("FASTAPI_ENV", FASTAPI_ENV).lower()
        if current_env == "production":
            raise HTTPException(
                status_code=500,
                detail=f"Database service initialization error: {e}",
            )
        return None


async def verify_jwt_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify Supabase JWT, return user_id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    
    if not SUPABASE_JWT_SECRET:
        current_env = os.getenv("FASTAPI_ENV", FASTAPI_ENV).lower()
        if current_env == "production":
            raise HTTPException(
                status_code=500,
                detail="Authentication service misconfigured: SUPABASE_JWT_SECRET required in production",
            )
        # Dev mode: allow anonymous
        return "anonymous"
    
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def _parse_trusted_proxies(raw: Optional[str]) -> tuple[str, ...]:
    """Parse a comma-separated list of trusted proxy entries from env.

    Entries are matched against the WebSocket peer host verbatim. They are
    normally IP addresses, but a literal host token (e.g. ``testclient`` under
    Starlette's TestClient) is also accepted so tests and non-IP peers work.
    """
    if not raw:
        return ()
    tokens: list[str] = []
    for part in raw.split(","):
        token = part.strip()
        if not token:
            continue
        try:
            ipaddress.ip_address(token)
        except ValueError:
            logger.warning("TRUSTED_PROXIES entry is not an IP address: %r", token)
        tokens.append(token)
    return tuple(tokens)


# Only trust X-Forwarded-For / CF-Connecting-IP when the immediate peer is a
# configured proxy. Otherwise any client could spoof these headers to bypass
# the IP-based rate limit (#191).
TRUSTED_PROXIES = _parse_trusted_proxies(os.getenv("TRUSTED_PROXIES"))


def _is_trusted_proxy(peer_ip: Optional[str]) -> bool:
    if not TRUSTED_PROXIES or not peer_ip:
        return False
    # Fast path / literal host token (e.g. "testclient").
    if peer_ip in TRUSTED_PROXIES:
        return True
    try:
        peer = ipaddress.ip_address(peer_ip)
    except ValueError:
        return False
    for token in TRUSTED_PROXIES:
        try:
            if peer == ipaddress.ip_address(token):
                return True
        except ValueError:
            continue
    return False


def get_client_ip(websocket: WebSocket) -> str:
    """Extract client IP address from a WebSocket connection.

    Forwarded headers (``X-Forwarded-For`` / ``CF-Connecting-IP``) are only
    honored when the immediate peer is a configured trusted proxy
    (``TRUSTED_PROXIES``). Otherwise the peer address is authoritative, so a
    client cannot spoof these headers to get a fresh rate-limit bucket (#191).
    """
    peer_ip = websocket.client.host if websocket.client else None

    if _is_trusted_proxy(peer_ip):
        forwarded = websocket.headers.get("x-forwarded-for")
        if forwarded:
            # Left-most entry is the original client (per XFF convention).
            candidate = forwarded.split(",")[0].strip()
            if candidate:
                return candidate
        cf_ip = websocket.headers.get("cf-connecting-ip")
        if cf_ip:
            return cf_ip.strip()

    if peer_ip:
        return peer_ip
    return "127.0.0.1"


def prune_expired_rate_limit_keys(cutoff_seconds: int = 60) -> int:
    """Prune entries from request_counts whose timestamps have expired. Returns count of keys removed."""
    now_ts = datetime.now().timestamp()
    cutoff = now_ts - cutoff_seconds
    keys_to_remove = []

    for user_key, timestamps in list(request_counts.items()):
        active_ts = [ts for ts in timestamps if ts.timestamp() > cutoff]
        if not active_ts:
            keys_to_remove.append(user_key)
        else:
            request_counts[user_key] = active_ts

    for k in keys_to_remove:
        del request_counts[k]

    return len(keys_to_remove)


def check_rate_limit(user_id: str, limit: Optional[int] = None, window_seconds: int = 60) -> bool:
    """Check if user is within rate limit using sliding window and bounded LRU storage."""
    effective_limit = limit if limit is not None else RATE_LIMIT
    now = datetime.now()
    window_start = now.timestamp() - window_seconds

    # Prune user's expired requests
    if user_id in request_counts:
        request_counts[user_id] = [
            ts for ts in request_counts[user_id]
            if ts.timestamp() > window_start
        ]
        if not request_counts[user_id]:
            del request_counts[user_id]

    if user_id not in request_counts:
        # Enforce max key capacity
        if len(request_counts) >= MAX_RATE_LIMIT_KEYS:
            prune_expired_rate_limit_keys(cutoff_seconds=window_seconds)
            while len(request_counts) >= MAX_RATE_LIMIT_KEYS and request_counts:
                request_counts.popitem(last=False)
        request_counts[user_id] = []

    # Check limit
    if len(request_counts[user_id]) >= effective_limit:
        request_counts.move_to_end(user_id)
        return False

    # Record this request
    request_counts[user_id].append(now)
    request_counts.move_to_end(user_id)
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global ai_gateway
    if not GOOGLE_API_KEY:
        print("⚠️ GOOGLE_API_KEY not set - AI features will be unavailable")
    else:
        ai_gateway = AIGateway(api_key=GOOGLE_API_KEY)
        print("✅ AI Gateway initialized")
    
    # Verify Supabase connection
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            get_supabase_client()
            print("✅ Supabase client initialized")
        except Exception as e:
            print(f"⚠️ Supabase init failed: {e}")
    
    print("✅ Backend initialized successfully")
    yield
    # Shutdown
    print("👋 Backend shutting down")


app.router.lifespan_context = lifespan

# CORS middleware configuration (#CC-009)
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://chronocoder.com",
    "https://www.chronocoder.com",
]


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", os.getenv("CORS_ORIGINS", ""))
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return DEFAULT_ALLOWED_ORIGINS


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "healthy", "message": "ChronoCoder v4 API", "version": "4.0.0"}


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "chronocoder-backend"
    }


# Public mentor catalog endpoints (#CC-018)
@app.get("/api/mentors", tags=["mentors"])
async def get_mentors():
    if not ai_gateway:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    return {"mentors": ai_gateway.list_mentors()}


@app.get("/api/mentors/{mentor_id}", tags=["mentors"])
async def get_mentor(mentor_id: str):
    if not ai_gateway:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    config = ai_gateway.get_mentor_config(mentor_id)
    if not config:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return {
        "id": config.mentor_id,
        "name": config.name,
        "era": config.era,
        "icon": config.icon,
        "accent_color": config.accent_color,
        "avatar_url": config.avatar_url,
        "signature_opening": config.signature_opening,
    }


# Session persistence endpoint (#CC-012)
@app.post("/api/sessions", status_code=201, tags=["sessions"])
async def create_session(
    session_data: dict,
    user_id: str = Depends(verify_jwt_token),
    repo: Optional[SessionRepository] = Depends(get_session_repo),
):
    user_uuid = coerce_uuid(user_id)

    mentor_id = session_data.get("mentor_id") or session_data.get("mentorId") or "ada_lovelace"
    user_code = session_data.get("user_code") or session_data.get("userCode") or ""
    language = session_data.get("language") or "python"
    complexity = session_data.get("complexity_score")
    if complexity is None and isinstance(session_data.get("analysis"), dict):
        complexity = session_data["analysis"].get("complexity_score")

    session_create = SessionCreate(
        mentor_id=mentor_id,
        user_code=user_code,
        language=language,
        complexity_score=complexity,
    )

    if repo is not None:
        created = await repo.create_session(user_uuid, session_create)
        return {
            "status": "active",
            "session_id": str(created.id),
            "mentor_id": created.mentor_id,
            "user_id": str(created.user_id),
            "created_at": created.created_at.isoformat() if hasattr(created.created_at, "isoformat") else str(created.created_at),
        }

    session_id = session_data.get("session_id") or session_data.get("sessionId") or str(uuid.uuid4())
    return {
        "status": "active",
        "session_id": str(session_id),
        "mentor_id": mentor_id,
        "user_id": str(user_uuid),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def get_stream_pace_delay() -> float:
    """Return stream chunk delay in seconds from WS_STREAM_PACE_MS (#CC-021)."""
    try:
        pace_ms = float(os.getenv("WS_STREAM_PACE_MS", "0"))
        return max(0.0, pace_ms / 1000.0)
    except (ValueError, TypeError):
        return 0.0


# WebSocket endpoint with auth
@app.websocket("/ws/feedback")
async def feedback_websocket(websocket: WebSocket):
    connected = await manager.connect(websocket)
    if not connected:
        return
    
    try:
        while True:
            data = await websocket.receive_json()

            # Heartbeat ping/pong keepalive (#CC-016)
            if data.get("type") == "ping" or data.get("action") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                continue

            mentor_id = data.get("mentor_id")
            user_code = data.get("user_code", "")
            session_id = data.get("session_id")

            # Validate types before use (#311): a non-string user_code (e.g.
            # 123, [], {}) passed the truthiness check below and then crashed
            # analyze_code_locally() with AttributeError, which the outer
            # handler swallowed and turned into a silent disconnect. A
            # non-string mentor_id likewise raises TypeError on the `in` check.
            if "mentor_id" in data and not isinstance(mentor_id, str):
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_INPUT", "message": "mentor_id must be a string"}
                })
                continue
            if "user_code" in data and not isinstance(user_code, str):
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_INPUT", "message": "user_code must be a string"}
                })
                continue

            if not mentor_id or not user_code:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_INPUT", "message": "Missing mentor_id or user_code"}
                })
                continue

            if ai_gateway and mentor_id not in ai_gateway.mentors:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "UNKNOWN_MENTOR", "message": f"Unknown mentor: {mentor_id}"}
                })
                continue
            
            # Rate limit by session_id or client IP when unauthenticated (#CC-011)
            client_ip = get_client_ip(websocket)
            rate_limit_key = (
                session_id.strip()
                if (session_id and isinstance(session_id, str) and session_id.strip() and session_id.strip() != "anonymous")
                else f"ip:{client_ip}"
            )
            if not check_rate_limit(rate_limit_key):
                await websocket.send_json({
                    "type": "error",
                    "payload": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please wait.",
                        "retry_after": 60,
                    },
                })
                continue
            
            # Send analysis complete event first
            local_analysis = analyze_code_locally(user_code)
            await websocket.send_json({
                "type": "analysis_complete",
                "payload": local_analysis
            })
            
            # Stream AI feedback with structured output
            if ai_gateway:
                try:
                    async for chunk in ai_gateway.get_feedback_streaming(
                        mentor_id=mentor_id,
                        user_code=user_code,
                        code_analysis=local_analysis
                    ):
                        # chunk is already a dict with type/payload from new AIGateway
                        await websocket.send_json(chunk)
                        pace_delay = get_stream_pace_delay()
                        if pace_delay > 0:
                            await asyncio.sleep(pace_delay)

                    await websocket.send_json({
                        "type": "feedback_complete",
                        "payload": {"mentor_id": mentor_id, "session_id": session_id}
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"code": "AI_ERROR", "message": str(e)}
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "AI_UNAVAILABLE", "message": "AI service temporarily unavailable"}
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)


def analyze_code_locally(code: str) -> dict:
    """Analyze code locally using Python AST parser with regex fallback for incomplete syntax (#CC-013)."""
    lines = code.split("\n")
    functions = 0
    classes = 0
    imports = 0

    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions += 1
            elif isinstance(node, ast.ClassDef):
                classes += 1
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                imports += 1
    except SyntaxError:
        # Fallback regex parsing when code contains syntax errors (e.g. typing in progress)
        func_re = re.compile(r"^\s*(?:async\s+)?def\s+[a-zA-Z_]\w*\s*(\(|:)")
        class_re = re.compile(r"^\s*class\s+[a-zA-Z_]\w*\s*(\(|:)")
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if func_re.match(line):
                functions += 1
            elif class_re.match(line):
                classes += 1
            elif stripped.startswith("import ") or stripped.startswith("from "):
                imports += 1

    complexity_score = min((functions * 2 + classes + imports), 10)

    return {
        "line_count": len(lines),
        "functions": functions,
        "classes": classes,
        "imports": imports,
        "complexity_score": complexity_score,
        "estimated_tokens": max(0 if not code else 1, len(code) // 4),
    }


def get_uvicorn_config() -> dict:
    """Return runtime configuration for uvicorn server (#CC-019)."""
    reload_env = os.getenv("FASTAPI_RELOAD") or os.getenv("UVICORN_RELOAD")
    if reload_env is not None:
        should_reload = reload_env.strip().lower() in ("true", "1", "yes")
    else:
        should_reload = os.getenv("FASTAPI_ENV", FASTAPI_ENV).strip().lower() != "production"

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    return {
        "app": "main:app",
        "host": host,
        "port": port,
        "reload": should_reload,
    }


if __name__ == "__main__":
    import uvicorn
    cfg = get_uvicorn_config()
    uvicorn.run(cfg["app"], host=cfg["host"], port=cfg["port"], reload=cfg["reload"])
