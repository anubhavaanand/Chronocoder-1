"""
WebSocket feedback contract tests.

These pin the message contract between the FastAPI backend and the
frontend hook (src/hooks/useMentorWebSocket.ts):

    connect -> client sends {mentor_id, user_code, session_id}
    server  -> analysis_complete, feedback_chunk*, feedback_complete
    errors  -> {type: "error", payload: {code, message}}

If these tests fail, the frontend streaming UI breaks with them.
Run:  python -m pytest backend/tests -v
"""

import pytest
from fastapi.testclient import TestClient

import backend.main as backend_main

VALID_CODE = "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n"


class StubAIGateway:
    """Stands in for the Gemini gateway so tests never need an API key."""

    mentors = {"ada_lovelace": object()}

    def list_mentors(self):
        return [{"mentor_id": "ada_lovelace", "avatar_url": "/mentors/ada_lovelace.jpg"}]

    def get_mentor_config(self, mentor_id):
        return None

    async def get_feedback_streaming(self, mentor_id, user_code, code_analysis):
        yield {
            "type": "feedback_chunk",
            "payload": {
                "reading": "The Engine sees a recursive weave.",
                "sections": [
                    {"id": "harmonies", "label": "Harmonies", "icon": "✨", "content": "Base case present."}
                ],
                "challenge": "Memoize it.",
                "closing": "The Engine awaits your next instruction.",
            },
        }


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend_main, "ai_gateway", StubAIGateway())
    with TestClient(backend_main.app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "chronocoder-backend"
    # Ensure timezone-aware ISO string is returned without deprecation warnings (#CC-014)
    assert "timestamp" in data
    from datetime import datetime
    ts = datetime.fromisoformat(data["timestamp"])
    assert ts.tzinfo is not None


def test_feedback_message_sequence(client):
    """The exact event order the frontend hook depends on."""
    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE, "session_id": "t1"})
        messages = [ws.receive_json() for _ in range(3)]

    assert [m["type"] for m in messages] == [
        "analysis_complete",
        "feedback_chunk",
        "feedback_complete",
    ]

    analysis = messages[0]["payload"]
    # backend counts lines with str.split("\n") — a trailing newline is a line
    assert analysis["line_count"] == len(VALID_CODE.split("\n"))
    assert analysis["functions"] == 1

    chunk = messages[1]["payload"]
    assert chunk["reading"] and chunk["sections"] and chunk["challenge"] and chunk["closing"]

    assert messages[2]["payload"]["mentor_id"] == "ada_lovelace"
    assert messages[2]["payload"]["session_id"] == "t1"


def test_invalid_input_is_rejected(client):
    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": "", "user_code": ""})
        message = ws.receive_json()

    assert message["type"] == "error"
    assert message["payload"]["code"] == "INVALID_INPUT"


def test_unknown_mentor_is_rejected_before_analysis(client):
    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": "ghost_mentor", "user_code": VALID_CODE})
        message = ws.receive_json()

    assert message["type"] == "error"
    assert message["payload"]["code"] == "UNKNOWN_MENTOR"


def test_mentor_registry_loads_all_personas():
    """The generator (scripts/generate_mentor_data.py) and the API both
    depend on every mentor JSON parsing into a valid MentorConfig."""
    from backend.services.ai_service import AIGateway

    gateway = AIGateway(api_key="test-key-not-used")
    assert len(gateway.mentors) == 8
    for mentor_id in (
        "ada_lovelace",
        "alan_turing",
        "grace_hopper",
        "margaret_hamilton",
        "dennis_ritchie",
        "barbara_liskov",
        "guido_van_rossum",
        "linus_torvalds",
    ):
        assert mentor_id in gateway.mentors, f"missing persona: {mentor_id}"
        config = gateway.mentors[mentor_id]
        assert config.avatar_url is not None
        assert config.avatar_url.startswith("/mentors/")


def test_mentor_config_and_api_includes_avatar_url():
    """Verify avatar_url is present in MentorConfig, list_mentors, and /api/mentors endpoints (#CC-007)."""
    from backend.services.ai_service import AIGateway

    gateway = AIGateway(api_key="test-key-not-used")
    mentors_list = gateway.list_mentors()
    assert len(mentors_list) == 8
    for m in mentors_list:
        assert "avatar_url" in m
        assert m["avatar_url"].startswith("/mentors/")

    # Test via FastAPI endpoints
    import backend.main as backend_main
    monkeypatch_gateway = gateway
    old_gateway = backend_main.ai_gateway
    backend_main.ai_gateway = monkeypatch_gateway
    try:
        with TestClient(backend_main.app) as test_client:
            auth_headers = {"Authorization": "Bearer dev-test-token"}
            res = test_client.get("/api/mentors", headers=auth_headers)
            assert res.status_code == 200
            for mentor in res.json()["mentors"]:
                assert "avatar_url" in mentor
                assert mentor["avatar_url"].startswith("/mentors/")

            single_res = test_client.get("/api/mentors/ada_lovelace", headers=auth_headers)
            assert single_res.status_code == 200
            data = single_res.json()
            assert data["avatar_url"] == "/mentors/ada_lovelace.jpg"
    finally:
        backend_main.ai_gateway = old_gateway


def test_verify_jwt_token_production_requires_secret(client, monkeypatch):
    """Ensure unauthenticated bypass is rejected with HTTP 500 in production if secret missing (#CC-008)."""
    monkeypatch.setenv("FASTAPI_ENV", "production")
    monkeypatch.setattr(backend_main, "SUPABASE_JWT_SECRET", None)

    res = client.post(
        "/api/sessions",
        json={"mentor_id": "ada_lovelace", "user_code": "x = 1"},
        headers={"Authorization": "Bearer any-token"},
    )
    assert res.status_code == 500
    assert "SUPABASE_JWT_SECRET required in production" in res.json()["detail"]


def test_verify_jwt_token_production_validates_token(client, monkeypatch):
    """Ensure valid tokens are decoded and invalid tokens rejected with HTTP 401 in production (#CC-008)."""
    from jose import jwt

    secret = "test-secret-key-for-jwt-verification-12345"
    monkeypatch.setenv("FASTAPI_ENV", "production")
    monkeypatch.setattr(backend_main, "SUPABASE_JWT_SECRET", secret)
    backend_main.app.dependency_overrides[backend_main.get_session_repo] = lambda: None

    try:
        valid_token = jwt.encode({"sub": "user_123", "aud": "authenticated"}, secret, algorithm="HS256")
        invalid_token = jwt.encode({"sub": "user_123", "aud": "wrong_audience"}, "wrong_secret", algorithm="HS256")

        # Valid token succeeds
        res_valid = client.post(
            "/api/sessions",
            json={"mentor_id": "ada_lovelace", "user_code": "x = 1"},
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert res_valid.status_code == 201

        # Invalid token fails with 401
        res_invalid = client.post(
            "/api/sessions",
            json={"mentor_id": "ada_lovelace", "user_code": "x = 1"},
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert res_invalid.status_code == 401
        assert "Invalid token" in res_invalid.json()["detail"]
    finally:
        backend_main.app.dependency_overrides.pop(backend_main.get_session_repo, None)


def test_mentor_catalog_endpoints_are_public_without_auth(client):
    """Ensure GET /api/mentors and GET /api/mentors/{mentor_id} are publicly accessible without authentication (#CC-018)."""
    from backend.services.ai_service import AIGateway
    gateway = AIGateway(api_key="test-key-not-used")
    old_gateway = backend_main.ai_gateway
    backend_main.ai_gateway = gateway
    try:
        # 1. GET /api/mentors without any Authorization header
        res = client.get("/api/mentors")
        assert res.status_code == 200
        data = res.json()
        assert "mentors" in data
        assert any(m["mentor_id"] == "ada_lovelace" for m in data["mentors"])

        # 2. GET /api/mentors/{mentor_id} without any Authorization header
        single_res = client.get("/api/mentors/ada_lovelace")
        assert single_res.status_code == 200
        mentor_data = single_res.json()
        assert mentor_data["id"] == "ada_lovelace"
        assert mentor_data["name"] == "Ada Lovelace"
        assert mentor_data["avatar_url"] == "/mentors/ada_lovelace.jpg"
    finally:
        backend_main.ai_gateway = old_gateway


def test_cors_allowed_origin_returns_credentials_and_origin(client):
    """Ensure allowed origin receives exact origin and credentials headers (#CC-009)."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"
    # Origin must not be wildcard '*' when credentials=True
    assert response.headers.get("access-control-allow-origin") != "*"


def test_cors_disallowed_origin_rejected(client):
    """Ensure unknown/malicious origin does not receive access-control-allow-origin (#CC-009)."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://malicious-domain.evil.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_get_allowed_origins_env_override(monkeypatch):
    """Ensure ALLOWED_ORIGINS env var configures custom comma-separated origins (#CC-009)."""
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.chronocoder.io, https://staging.chronocoder.io")
    origins = backend_main.get_allowed_origins()
    assert origins == ["https://app.chronocoder.io", "https://staging.chronocoder.io"]


def test_rate_limit_sliding_window_and_limit():
    """Ensure check_rate_limit enforces rate limit and sliding window (#CC-010)."""
    backend_main.request_counts.clear()
    user = "test_user_rate"

    # Make 5 requests with limit=5
    for _ in range(5):
        assert backend_main.check_rate_limit(user, limit=5, window_seconds=60) is True

    # 6th request must be rejected
    assert backend_main.check_rate_limit(user, limit=5, window_seconds=60) is False
    backend_main.request_counts.clear()


def test_rate_limit_prunes_expired_keys():
    """Ensure expired timestamps and idle keys are purged to prevent memory leaks (#CC-010)."""
    from datetime import datetime, timedelta

    backend_main.request_counts.clear()
    old_time = datetime.now() - timedelta(seconds=120)

    # Insert old timestamps for user_idle
    backend_main.request_counts["user_idle"] = [old_time, old_time]
    backend_main.request_counts["user_active"] = [datetime.now()]

    removed = backend_main.prune_expired_rate_limit_keys(cutoff_seconds=60)
    assert removed == 1
    assert "user_idle" not in backend_main.request_counts
    assert "user_active" in backend_main.request_counts

    backend_main.request_counts.clear()


def test_rate_limit_lru_capacity_eviction(monkeypatch):
    """Ensure MAX_RATE_LIMIT_KEYS strictly bounds dictionary size using LRU eviction (#CC-010)."""
    backend_main.request_counts.clear()
    monkeypatch.setattr(backend_main, "MAX_RATE_LIMIT_KEYS", 3)

    # Add 3 users
    assert backend_main.check_rate_limit("u1", limit=10) is True
    assert backend_main.check_rate_limit("u2", limit=10) is True
    assert backend_main.check_rate_limit("u3", limit=10) is True
    assert len(backend_main.request_counts) == 3

    # Touch u1 so order is u2 (oldest), u3, u1 (newest)
    assert backend_main.check_rate_limit("u1", limit=10) is True

    # Add u4 -> u2 must be evicted as LRU
    assert backend_main.check_rate_limit("u4", limit=10) is True
    assert len(backend_main.request_counts) == 3
    assert "u2" not in backend_main.request_counts
    assert "u1" in backend_main.request_counts
    assert "u3" in backend_main.request_counts
    assert "u4" in backend_main.request_counts

    backend_main.request_counts.clear()


def test_get_client_ip_extraction():
    """Ensure get_client_ip correctly resolves client IP and forwarded headers (#CC-011)."""
    from starlette.datastructures import Headers

    class DummyClient:
        host = "192.168.1.50"

    class DummyWS:
        def __init__(self, headers=None, client=None):
            self.headers = Headers(headers or {})
            self.client = client

    # Normal client
    ws1 = DummyWS(client=DummyClient())
    assert backend_main.get_client_ip(ws1) == "192.168.1.50"

    # Forwarded header
    ws2 = DummyWS(headers={"x-forwarded-for": "203.0.113.195, 70.41.3.18"}, client=DummyClient())
    assert backend_main.get_client_ip(ws2) == "203.0.113.195"

    # Cloudflare header
    ws3 = DummyWS(headers={"cf-connecting-ip": "198.51.100.8"}, client=DummyClient())
    assert backend_main.get_client_ip(ws3) == "198.51.100.8"

    # Missing client
    ws4 = DummyWS()
    assert backend_main.get_client_ip(ws4) == "127.0.0.1"


def test_websocket_anonymous_rate_limiting_isolated_per_ip(client, monkeypatch):
    """Ensure anonymous WebSocket users are rate-limited per IP rather than a shared bucket (#CC-011)."""
    backend_main.request_counts.clear()
    monkeypatch.setattr(backend_main, "RATE_LIMIT", 2)

    # Client A from IP 198.51.100.1 sends 2 requests without session_id (rate limit = 2)
    with client.websocket_connect("/ws/feedback", headers={"x-forwarded-for": "198.51.100.1"}) as ws_a:
        ws_a.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE})
        m1 = ws_a.receive_json()
        assert m1["type"] == "analysis_complete"

        # Drain rest of feedback messages
        ws_a.receive_json()  # feedback_chunk
        ws_a.receive_json()  # feedback_complete

        # 2nd request
        ws_a.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE})
        m2 = ws_a.receive_json()
        assert m2["type"] == "analysis_complete"
        ws_a.receive_json()
        ws_a.receive_json()

        # 3rd request from Client A exceeds limit
        ws_a.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE})
        err = ws_a.receive_json()
        assert err["type"] == "error"
        assert err["payload"]["code"] == "RATE_LIMIT_EXCEEDED"

    # Client B from IP 203.0.113.2 connects without session_id
    # Client B must NOT be blocked by Client A's exhaustion of their quota
    with client.websocket_connect("/ws/feedback", headers={"x-forwarded-for": "203.0.113.2"}) as ws_b:
        ws_b.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE})
        m_b = ws_b.receive_json()
        assert m_b["type"] == "analysis_complete"

    backend_main.request_counts.clear()


def test_create_session_endpoint_wires_to_repository(client):
    """Ensure POST /api/sessions persists session via SessionRepository (#CC-012)."""
    import uuid
    from datetime import datetime
    from backend.db.session_repo import Session

    created_id = uuid.uuid4()
    user_uuid = uuid.uuid4()
    mock_session = Session(
        id=created_id,
        user_id=user_uuid,
        mentor_id="ada_lovelace",
        user_code="print('persisted')",
        language="python",
        complexity_score=2,
        status="active",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    class MockSessionRepo:
        def __init__(self):
            self.calls = []

        async def create_session(self, u_id, data):
            self.calls.append((u_id, data))
            return mock_session

    mock_repo = MockSessionRepo()
    backend_main.app.dependency_overrides[backend_main.get_session_repo] = lambda: mock_repo

    try:
        response = client.post(
            "/api/sessions",
            json={
                "mentor_id": "ada_lovelace",
                "user_code": "print('persisted')",
                "complexity_score": 2,
            },
            headers={"Authorization": "Bearer test-dev-token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "active"
        assert data["session_id"] == str(created_id)
        assert data["mentor_id"] == "ada_lovelace"

        # Verify repo was called
        assert len(mock_repo.calls) == 1
        call_user_id, call_data = mock_repo.calls[0]
        assert call_data.mentor_id == "ada_lovelace"
        assert call_data.user_code == "print('persisted')"
    finally:
        backend_main.app.dependency_overrides.pop(backend_main.get_session_repo, None)


def test_create_session_dev_fallback_without_repo(client):
    """Ensure POST /api/sessions gracefully falls back when repo is unavailable in dev (#CC-012)."""
    backend_main.app.dependency_overrides[backend_main.get_session_repo] = lambda: None

    try:
        response = client.post(
            "/api/sessions",
            json={
                "mentorId": "alan_turing",
                "userCode": "x = 42",
                "sessionId": "custom-sess-777",
            },
            headers={"Authorization": "Bearer test-dev-token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "active"
        assert data["session_id"] == "custom-sess-777"
        assert data["mentor_id"] == "alan_turing"
    finally:
        backend_main.app.dependency_overrides.pop(backend_main.get_session_repo, None)


def test_get_session_repo_production_requires_supabase(monkeypatch):
    """Ensure get_session_repo raises HTTP 500 when Supabase is missing in production (#CC-012)."""
    monkeypatch.setenv("FASTAPI_ENV", "production")
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    monkeypatch.setattr(backend_main, "session_repo", None)

    with pytest.raises(backend_main.HTTPException) as exc_info:
        backend_main.get_session_repo()
    assert exc_info.value.status_code == 500
    assert "Database service misconfigured" in exc_info.value.detail


def test_analyze_code_locally_ignores_comments_and_strings():
    """Ensure analyze_code_locally does not falsely count comments or string literals as functions/classes (#CC-013)."""
    code = (
        "# def commented_func(): pass\n"
        "# class CommentedClass: pass\n"
        "s = 'def string_func(): pass'\n"
        "class_name = 'btn class something'\n"
        "msg = 'import fake_module'\n"
    )
    result = backend_main.analyze_code_locally(code)
    assert result["functions"] == 0
    assert result["classes"] == 0
    assert result["imports"] == 0


def test_analyze_code_locally_counts_ast_constructs():
    """Ensure analyze_code_locally accurately counts functions, classes, and imports (#CC-013)."""
    code = (
        "import math\n"
        "from typing import List, Optional\n"
        "\n"
        "async def async_fetch():\n"
        "    pass\n"
        "\n"
        "class DataModel:\n"
        "    def sync_method(self):\n"
        "        pass\n"
    )
    result = backend_main.analyze_code_locally(code)
    assert result["functions"] == 2  # async_fetch + sync_method
    assert result["classes"] == 1    # DataModel
    assert result["imports"] == 2    # import math + from typing
    assert result["complexity_score"] == min(2 * 2 + 1 + 2, 10)  # 7


def test_analyze_code_locally_fallback_on_syntax_error():
    """Ensure analyze_code_locally handles incomplete Python code during live typing (#CC-013)."""
    code = (
        "# def commented_out(): pass\n"
        "def unfinished_func(\n"
    )
    result = backend_main.analyze_code_locally(code)
    assert result["functions"] == 1
    assert result["classes"] == 0
    assert result["imports"] == 0


@pytest.mark.asyncio
async def test_connection_manager_concurrency_and_safe_broadcast():
    """Ensure ConnectionManager broadcast handles concurrent mutations without Set size error (#CC-015)."""
    from backend.utils.websocket_manager import ConnectionManager

    cm = ConnectionManager()

    class MockWS:
        def __init__(self, name, on_send=None):
            self.name = name
            self.on_send = on_send
            self.sent = []

        async def accept(self):
            pass

        async def send_json(self, msg):
            self.sent.append(msg)
            if self.on_send:
                await self.on_send()

    async def mutate_during_broadcast():
        # Concurrently add and remove connections while broadcast is awaiting send_json
        ws_new = MockWS("mutant")
        await cm.connect(ws_new)
        cm.disconnect(ws1)

    ws1 = MockWS("ws1", on_send=mutate_during_broadcast)
    ws2 = MockWS("ws2")

    await cm.connect(ws1)
    await cm.connect(ws2)
    assert cm.client_count == 2

    # Broadcast to all connections; must NOT raise RuntimeError
    await cm.broadcast({"type": "ping"})

    assert len(ws1.sent) == 1
    assert len(ws2.sent) == 1


@pytest.mark.asyncio
async def test_connection_manager_purges_disconnected():
    """Ensure ConnectionManager removes failing connections during broadcast (#CC-015)."""
    from backend.utils.websocket_manager import ConnectionManager

    cm = ConnectionManager()

    class FailingWS:
        async def accept(self):
            pass

        async def send_json(self, msg):
            raise ConnectionResetError("Client dropped connection")

    class HealthyWS:
        def __init__(self):
            self.sent = []

        async def accept(self):
            pass

        async def send_json(self, msg):
            self.sent.append(msg)

    failing = FailingWS()
    healthy = HealthyWS()

    await cm.connect(failing)
    await cm.connect(healthy)
    assert cm.client_count == 2

    await cm.broadcast({"test": "data"})
    assert cm.client_count == 1
    assert failing not in cm.active_connections
    assert healthy in cm.active_connections


def test_websocket_ping_pong_keepalive(client):
    """Ensure WebSocket endpoint responds to heartbeat ping messages with pong (#CC-016)."""
    with client.websocket_connect("/ws/feedback") as ws:
        # Send heartbeat ping
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"
        assert "timestamp" in pong

        # Connection remains functional for subsequent requests
        ws.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE, "session_id": "test_pong"})
        m = ws.receive_json()
        assert m["type"] == "analysis_complete"


@pytest.mark.asyncio
async def test_connection_manager_heartbeat_helpers():
    """Ensure ConnectionManager send_heartbeat and broadcast_heartbeat send pings and prune dead sockets (#CC-016)."""
    from backend.utils.websocket_manager import ConnectionManager

    cm = ConnectionManager()

    class MockWS:
        def __init__(self, succeeds=True):
            self.succeeds = succeeds
            self.sent = []

        async def accept(self):
            pass

        async def send_json(self, msg):
            if not self.succeeds:
                raise ConnectionError("Dropped socket")
            self.sent.append(msg)

    alive_ws = MockWS(succeeds=True)
    dead_ws = MockWS(succeeds=False)

    await cm.connect(alive_ws)
    await cm.connect(dead_ws)
    assert cm.client_count == 2

    # send_heartbeat to healthy socket
    assert await cm.send_heartbeat(alive_ws) is True
    assert alive_ws.sent[-1] == {"type": "ping"}

    # broadcast_heartbeat should prune dead_ws
    remaining = await cm.broadcast_heartbeat()
    assert remaining == 1
    assert dead_ws not in cm.active_connections


@pytest.mark.asyncio
async def test_connection_manager_caps_active_connections():
    """Ensure ConnectionManager enforces max_connections and closes excess sockets with 1013 (#CC-017)."""
    from backend.utils.websocket_manager import ConnectionManager

    cm = ConnectionManager(max_connections=2)

    class MockSocket:
        def __init__(self):
            self.accepted = False
            self.closed_code = None
            self.closed_reason = None

        async def accept(self):
            self.accepted = True

        async def close(self, code=1000, reason=""):
            self.closed_code = code
            self.closed_reason = reason

    ws1 = MockSocket()
    ws2 = MockSocket()
    ws3 = MockSocket()

    assert await cm.connect(ws1) is True
    assert ws1.accepted is True
    assert await cm.connect(ws2) is True
    assert ws2.accepted is True
    assert cm.client_count == 2

    # ws3 exceeds max_connections limit of 2
    assert await cm.connect(ws3) is False
    assert ws3.accepted is False
    assert ws3.closed_code == 1013
    assert "Server busy" in ws3.closed_reason
    assert cm.client_count == 2


def test_websocket_endpoint_rejects_at_capacity(client, monkeypatch):
    """Ensure WebSocket endpoint terminates connection with 1013 when server is at capacity (#CC-017)."""
    from starlette.websockets import WebSocketDisconnect

    backend_main.manager.active_connections.clear()
    monkeypatch.setattr(backend_main.manager, "max_connections", 1)

    # First client occupies the only slot
    with client.websocket_connect("/ws/feedback"):
        # Second concurrent client should be closed with code 1013
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect("/ws/feedback"):
                pass
        assert exc_info.value.code == 1013

    backend_main.manager.active_connections.clear()











