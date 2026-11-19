"""
ChronoCoder v3 - Backend API
FastAPI Application Server with Supabase Auth + Structured AI Feedback
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager, suppress
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
from backend.services.ai_service import AIGateway, load_mentor_registry, mentor_summary
from backend.utils.env import env_int
from backend.utils.websocket_manager import ConnectionManager
from backend.db.session_repo import (
    SessionRepository,
    SessionCreate,
    coerce_uuid,
    get_session_repo as get_session_repo_module,
)

# Configure logging once, at import. Uvicorn configures its own loggers but
# leaves the root logger alone, so without this the app-level records had no
# handler and no level control (#278).
_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
_log_level_name = os.getenv("LOG_LEVEL", "INFO").strip().upper()

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=getattr(logging, _log_level_name) if _log_level_name in _LOG_LEVELS else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

logger = logging.getLogger(__name__)

# Fixed client copy for AI failures. Never interpolate exception text (#315).
AI_CLIENT_ERROR_MESSAGE = (
    "The AI service is temporarily unavailable. Please try again."
)

app = FastAPI(
    title="ChronoCoder API",
    version="3.0.0",
    description="AI-Powered Python Learning Platform Backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Global state
manager = ConnectionManager()

# Interval between server-initiated heartbeat pings, in seconds. 0 disables the
# background task. Without it nothing ever called broadcast_heartbeat, so
# half-open sockets were only noticed when a send failed (#221).
WS_HEARTBEAT_INTERVAL = env_int("WS_HEARTBEAT_INTERVAL", 30)
ai_gateway: Optional[AIGateway] = None
supabase: Optional[Client] = None

# Supabase config
FASTAPI_ENV = os.getenv("FASTAPI_ENV", "development").lower()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Optional public origin (e.g. https://chronocoder-1.onrender.com) used to
# turn the frontend-relative avatar paths in backend/mentors/*.json into
# absolute URLs for API consumers (#276). Unset keeps the relative form.
PUBLIC_BASE_URL = (os.getenv("PUBLIC_BASE_URL") or "").rstrip("/")

# Mentor catalog. Loaded lazily and independent of the Gemini client: the
# catalog is static JSON and must be served even with no GOOGLE_API_KEY (#213).
_mentor_catalog: Optional[dict] = None


def _with_public_base(path: Optional[str]) -> Optional[str]:
    """Absolutise a frontend-relative asset path when PUBLIC_BASE_URL is set.

    Mentor configs store '/mentors/ada_lovelace.jpg', which only resolves
    against the Next.js origin. API clients outside that origin need an
    absolute URL; when PUBLIC_BASE_URL is unset the relative form is returned
    unchanged so existing consumers keep working (#276).
    """
    if not path or not PUBLIC_BASE_URL:
        return path
    if path.startswith(("http://", "https://")):
        return path
    return f"{PUBLIC_BASE_URL}/{path.lstrip('/')}"


def get_mentor_catalog() -> dict:
    """Return the mentor registry, loading it on first use.

    A failure here means the JSON catalog itself is missing or unreadable, so
    it surfaces as 503 rather than a 500 traceback.
    """
    global _mentor_catalog
    if _mentor_catalog is None:
        try:
            _mentor_catalog = load_mentor_registry()
        except Exception as e:
            logger.error("Mentor catalog failed to load: %s", e)
            raise HTTPException(status_code=503, detail="Mentor catalog unavailable")
    return _mentor_catalog

# Max accepted user_code length on the feedback WebSocket. The editor limit is
# advisory only, so the server has to enforce it too (#211).
MAX_CODE_LENGTH = env_int("MAX_CODE_LENGTH", 50000)

# Rate limiting
MAX_RATE_LIMIT_KEYS = env_int("MAX_RATE_LIMIT_KEYS", 10000)
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
    """Dependency provider returning a cached SessionRepository, or None in development.

    The cache lives in backend.db.session_repo; keeping a second one here
    meant the two could disagree (#284).
    """
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
        return get_session_repo_module()
    except Exception as e:
        # Never interpolate the exception text into a response: it can carry
        # the DSN, including the password (#315).
        logger.error("Database service initialization failed: %s", e)
        current_env = os.getenv("FASTAPI_ENV", FASTAPI_ENV).lower()
        if current_env == "production":
            raise HTTPException(
                status_code=500,
                detail="Database service is temporarily unavailable",
            )
        return None


def _decode_supabase_jwt(authorization: str) -> str:
    """Verify a ``Bearer <token>`` Authorization header and return the user id.

    Shared by the HTTP dependency (:func:`verify_jwt_token`) and the WebSocket
    handshake (:func:`verify_ws_token`) so the two paths can never drift —
    #190 existed because the socket accepted connections with no token at all
    while the REST path already enforced one.

    In dev mode without ``SUPABASE_JWT_SECRET`` set, verification is skipped and
    ``"anonymous"`` is returned, matching the existing dev fallback.
    """
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
        # Log the library's reason but return a fixed message: PyJWT's text
        # varies by failure mode and would tell a caller why a forged token was
        # rejected (#187).
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_jwt_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify Supabase JWT, return user_id."""
    return _decode_supabase_jwt(authorization or "")


async def verify_ws_token(websocket: WebSocket) -> str:
    """Verify the JWT carried in the WebSocket handshake.

    The token is read from the ``Authorization`` header first. Browsers do not
    let page JS set handshake headers on a ``WebSocket``, so the frontend
    encodes the token in the connection URL's ``token`` query parameter as a
    fallback (#286). A missing or invalid token closes the socket with 1008
    (Policy Violation) — a terminal close code the frontend treats as an
    unrecoverable auth failure (#CC-048) rather than a transient drop it would
    retry forever.
    """
    authorization = websocket.headers.get("authorization") or ""
    if not authorization:
        token_param = websocket.query_params.get("token")
        if token_param:
            authorization = f"Bearer {token_param}"
    try:
        return _decode_supabase_jwt(authorization)
    except HTTPException:
        await websocket.close(code=1008, reason="Unauthorized")
        raise


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


async def heartbeat_loop(interval: int) -> None:
    """Ping every connected client on a timer so dead sockets get pruned (#221)."""
    while True:
        await asyncio.sleep(interval)
        try:
            await manager.broadcast_heartbeat()
        except Exception:
            logger.exception("Heartbeat broadcast failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global ai_gateway
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set - AI features will be unavailable")
    else:
        ai_gateway = AIGateway(api_key=GOOGLE_API_KEY)
        logger.info("AI Gateway initialized")
    
    # Verify Supabase connection
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            get_supabase_client()
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.warning("Supabase init failed: %s", e)
    
    logger.info("Backend initialized successfully")

    heartbeat_task = (
        asyncio.create_task(heartbeat_loop(WS_HEARTBEAT_INTERVAL))
        if WS_HEARTBEAT_INTERVAL > 0
        else None
    )

    yield

    # Shutdown
    if heartbeat_task is not None:
        heartbeat_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
    if ai_gateway is not None:
        # Test stubs and partially-built gateways may not implement aclose().
        aclose = getattr(ai_gateway, "aclose", None)
        if aclose is not None:
            await aclose()
    logger.info("Backend shutting down")


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
    return {"status": "healthy", "message": "ChronoCoder v3 API", "version": "3.0.0"}


def _dependency_state(is_ready: bool, is_configured: bool) -> Optional[bool]:
    """Tri-state dependency health: True ready, False broken, None not configured."""
    if is_ready:
        return True
    return False if is_configured else None


@app.get("/api/health")
async def health_check():
    """Liveness plus per-dependency readiness.

    Always returns HTTP 200 while the process can serve. A missing API key or
    database credential is a configuration state, not a transient failure, so
    answering 503 would make the Docker/Fly healthchecks restart an otherwise
    healthy process in a loop. Callers that need to distinguish a broken
    deployment from a working one should read `status` / `checks`.

    Each check is tri-state:
      true  - dependency is initialised
      false - dependency is configured but failed to initialise
      null  - dependency is not configured (acceptable outside production)
    """
    checks = {
        "ai": _dependency_state(ai_gateway is not None, bool(GOOGLE_API_KEY)),
        "database": _dependency_state(supabase is not None, bool(SUPABASE_URL and SUPABASE_ANON_KEY)),
    }
    degraded = any(state is False for state in checks.values())
    return {
        "status": "degraded" if degraded else "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "chronocoder-backend",
        "checks": checks,
    }


# Public mentor catalog endpoints (#CC-018)
@app.get("/api/mentors", tags=["mentors"])
async def get_mentors():
    catalog = get_mentor_catalog()
    mentors = []
    for mentor in catalog.values():
        payload = mentor_summary(mentor)
        payload["avatar_url"] = _with_public_base(mentor.avatar_url)
        mentors.append(payload)
    return {"mentors": mentors}


@app.get("/api/mentors/{mentor_id}", tags=["mentors"])
async def get_mentor(mentor_id: str):
    config = get_mentor_catalog().get(mentor_id)
    if not config:
        raise HTTPException(status_code=404, detail="Mentor not found")
    # Keep the single-mentor shape (id, not mentor_id) that clients
    # already depend on.
    return {
        "id": config.mentor_id,
        "name": config.name,
        "era": config.era,
        "icon": config.icon,
        "accent_color": config.accent_color,
        "avatar_url": _with_public_base(config.avatar_url),
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

    # Reject oversized user_code before persisting. The REST endpoint takes an
    # untyped dict, so without this guard a client can post an arbitrarily large
    # body and have it written to the sessions table (#212). Mirror the WS
    # handler's MAX_CODE_LENGTH check so both transports agree.
    if not isinstance(user_code, str):
        raise HTTPException(
            status_code=422,
            detail="user_code must be a string",
        )
    if len(user_code) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"user_code exceeds {MAX_CODE_LENGTH} characters",
        )
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
    # #190: authenticate the socket before accepting. Without this the
    # /ws/feedback endpoint was open to anyone with a network path, and the
    # rate limit below was keyed only on IP — so an unauthenticated caller
    # could flood the shared anonymous bucket. Dev mode without
    # SUPABASE_JWT_SECRET falls back to "anonymous" to keep local dev working.
    user_id = await verify_ws_token(websocket)

    connected = await manager.connect(websocket)
    if not connected:
        return

    try:
        while True:
            # A malformed / non-JSON frame must not silently drop the connection
            # (#312). receive_json() raises json.JSONDecodeError (a ValueError)
            # on bad input; catch it, tell the client, and keep the socket open.
            try:
                data = await websocket.receive_json()
            except ValueError:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_JSON", "message": "Message must be valid JSON"},
                })
                continue

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

            # Reject oversized payloads before AST analysis or the Gemini call.
            # Without this the only guard is the editor's characterLimit, which
            # a non-browser client simply ignores (#211).
            if len(user_code) > MAX_CODE_LENGTH:
                await websocket.send_json({
                    "type": "error",
                    "payload": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": f"user_code exceeds {MAX_CODE_LENGTH} characters",
                    },
                })
                continue

            if ai_gateway and mentor_id not in ai_gateway.mentors:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "UNKNOWN_MENTOR", "message": f"Unknown mentor: {mentor_id}"}
                })
                continue
            
            # Rate limit by authenticated user id when a real JWT is present,
            # falling back to trusted client IP for anonymous/dev callers. The
            # session id is supplied by the client, so keying on it lets a
            # caller rotate ids to mint a fresh bucket (#216) — hence the user
            # id takes precedence now that the socket is authenticated (#190).
            client_ip = get_client_ip(websocket)
            rate_limit_key = f"user:{user_id}" if user_id != "anonymous" else f"ip:{client_ip}"
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
                    # Resolve once per request, not per chunk (#281)
                    pace_delay = get_stream_pace_delay()
                    async for chunk in ai_gateway.get_feedback_streaming(
                        mentor_id=mentor_id,
                        user_code=user_code,
                        code_analysis=local_analysis
                    ):
                        # chunk is already a dict with type/payload from new AIGateway
                        await websocket.send_json(chunk)
                        if pace_delay > 0:
                            await asyncio.sleep(pace_delay)

                    await websocket.send_json({
                        "type": "feedback_complete",
                        "payload": {"mentor_id": mentor_id, "session_id": session_id}
                    })
                except Exception as exc:
                    # Full exception stays server-side. `detail` is the raw
                    # upstream body on GeminiAPIError and is logged, never sent.
                    correlation_id = uuid.uuid4().hex[:8]
                    detail = getattr(exc, "detail", None)
                    logger.error(
                        "AI feedback streaming failed correlation_id=%s detail=%s",
                        correlation_id,
                        detail if isinstance(detail, str) else "",
                        exc_info=True,
                    )
                    await websocket.send_json({
                        "type": "error",
                        "payload": {
                            "code": "AI_ERROR",
                            "message": AI_CLIENT_ERROR_MESSAGE,
                            "correlation_id": correlation_id,
                        },
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "AI_UNAVAILABLE", "message": "AI service temporarily unavailable"}
                })
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        logger.exception("WebSocket error")
        await manager.disconnect(websocket)


def _strip_strings_and_comments(line: str, in_triple: str) -> tuple[str, str]:
    """Remove string literals and comments from one line of code.

    Returns the cleaned line plus the triple-quote delimiter still open, if
    any. Used by the syntax-error fallback in 'analyze_code_locally' so that
    'def'/'class' inside a string or a trailing comment is not counted
    as a definition (#289).
    """
    out: list[str] = []
    quote = ""
    i = 0
    while i < len(line):
        if in_triple:
            if line.startswith(in_triple, i):
                i += 3
                in_triple = ""
            else:
                i += 1
            continue
        if quote:
            if line[i] == "\\":
                i += 2
                continue
            if line[i] == quote:
                quote = ""
            i += 1
            continue
        if line.startswith(chr(34) * 3, i) or line.startswith(chr(39) * 3, i):
            in_triple = line[i : i + 3]
            i += 3
            continue
        if line[i] in (chr(34), chr(39)):
            quote = line[i]
            i += 1
            continue
        if line[i] == "#":
            break
        out.append(line[i])
        i += 1
    return "".join(out), in_triple


def analyze_code_locally(code: str) -> dict:
    """Analyze code locally using Python AST parser with regex fallback for incomplete syntax (#CC-013)."""
    # splitlines() handles \r\n and does not count a trailing newline as a line (#288)
    lines = code.splitlines()
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
        # Fallback regex parsing when code contains syntax errors (e.g. typing
        # in progress). Strings and comments are stripped first: without that,
        # `msg = "def helper()"` or `x = 1  # class Foo` counted as
        # definitions, and only whole-line comments were skipped (#289).
        func_re = re.compile(r"^\s*(?:async\s+)?def\s+[a-zA-Z_]\w*\s*(\(|:)")
        class_re = re.compile(r"^\s*class\s+[a-zA-Z_]\w*\s*(\(|:)")
        in_triple = ""
        for line in lines:
            cleaned, in_triple = _strip_strings_and_comments(line, in_triple)
            stripped = cleaned.strip()
            if not stripped:
                continue
            if func_re.match(cleaned):
                functions += 1
            elif class_re.match(cleaned):
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

    port = env_int("PORT", 8000)
    host = os.getenv("HOST", "0.0.0.0")
    return {
        "app": "backend.main:app",
        "host": host,
        "port": port,
        "reload": should_reload,
    }


if __name__ == "__main__":
    import uvicorn
    cfg = get_uvicorn_config()
    uvicorn.run(cfg["app"], host=cfg["host"], port=cfg["port"], reload=cfg["reload"])
