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


def test_non_string_user_code_is_rejected_without_disconnect(client):
    """Non-string user_code must yield an INVALID_INPUT error, not a silent close (#311).

    Previously `user_code=123` passed the truthiness check and then crashed
    `analyze_code_locally()` with AttributeError, which the outer handler
    swallowed and turned into a disconnect with no error event.
    """
    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": "ada_lovelace", "user_code": 123})
        message = ws.receive_json()

        assert message["type"] == "error"
        assert message["payload"]["code"] == "INVALID_INPUT"
        assert "string" in message["payload"]["message"].lower()

        # The socket must still be usable afterwards (no disconnect).
        ws.send_json({"mentor_id": "", "user_code": ""})
        follow_up = ws.receive_json()
        assert follow_up["type"] == "error"
        assert follow_up["payload"]["code"] == "INVALID_INPUT"


def test_non_string_mentor_id_is_rejected(client):
    """A non-string mentor_id must yield INVALID_INPUT instead of a TypeError crash (#311)."""
    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": ["ada_lovelace"], "user_code": VALID_CODE})
        message = ws.receive_json()

    assert message["type"] == "error"
    assert message["payload"]["code"] == "INVALID_INPUT"


def test_non_string_user_code_list_is_rejected(client):
    """A list/dict user_code is truthy but must still be rejected as INVALID_INPUT (#311)."""
    for bad in ([], {}, ["print(1)"]):
        with client.websocket_connect("/ws/feedback") as ws:
            ws.send_json({"mentor_id": "ada_lovelace", "user_code": bad})
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


def test_get_client_ip_extraction(monkeypatch):
    """Ensure get_client_ip trusts forwarded headers only from configured proxies (#CC-011, #191)."""
    from starlette.datastructures import Headers

    class DummyClient:
        host = "192.168.1.50"

    class DummyWS:
        def __init__(self, headers=None, client=None):
            self.headers = Headers(headers or {})
            self.client = client

    # No TRUSTED_PROXIES configured: forwarded headers are ignored, the peer
    # address is authoritative (#191).
    monkeypatch.setattr(backend_main, "TRUSTED_PROXIES", ())

    ws1 = DummyWS(client=DummyClient())
    assert backend_main.get_client_ip(ws1) == "192.168.1.50"

    # Spoofed X-Forwarded-For from an untrusted peer is ignored.
    ws2 = DummyWS(headers={"x-forwarded-for": "203.0.113.195, 70.41.3.18"}, client=DummyClient())
    assert backend_main.get_client_ip(ws2) == "192.168.1.50"

    # Spoofed CF-Connecting-IP from an untrusted peer is ignored.
    ws3 = DummyWS(headers={"cf-connecting-ip": "198.51.100.8"}, client=DummyClient())
    assert backend_main.get_client_ip(ws3) == "192.168.1.50"

    # Missing client falls back to loopback.
    ws4 = DummyWS()
    assert backend_main.get_client_ip(ws4) == "127.0.0.1"

    # When the peer IS a trusted proxy, forwarded headers are honored.
    monkeypatch.setattr(backend_main, "TRUSTED_PROXIES", ("192.168.1.50",))
    ws5 = DummyWS(headers={"x-forwarded-for": "203.0.113.195, 70.41.3.18"}, client=DummyClient())
    assert backend_main.get_client_ip(ws5) == "203.0.113.195"

    ws6 = DummyWS(headers={"cf-connecting-ip": "198.51.100.8"}, client=DummyClient())
    assert backend_main.get_client_ip(ws6) == "198.51.100.8"


def test_websocket_anonymous_rate_limiting_isolated_per_ip(client, monkeypatch):
    """Ensure anonymous WebSocket users are rate-limited per IP rather than a shared bucket (#CC-011, #191)."""
    backend_main.request_counts.clear()
    monkeypatch.setattr(backend_main, "RATE_LIMIT", 2)
    # Starlette's TestClient reports the peer host as the literal "testclient"
    # (not an IP). Trust it so X-Forwarded-For headers — which simulate
    # distinct client IPs — are honored in this test.
    monkeypatch.setattr(backend_main, "TRUSTED_PROXIES", ("testclient",))


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


def test_uvicorn_config_reload_and_environment(monkeypatch):
    """Ensure get_uvicorn_config respects FASTAPI_RELOAD, UVICORN_RELOAD, FASTAPI_ENV, PORT, and HOST (#CC-019)."""
    # 1. Default development environment enables reload
    monkeypatch.delenv("FASTAPI_RELOAD", raising=False)
    monkeypatch.delenv("UVICORN_RELOAD", raising=False)
    monkeypatch.setenv("FASTAPI_ENV", "development")
    monkeypatch.setenv("PORT", "9000")
    monkeypatch.setenv("HOST", "127.0.0.1")

    cfg = backend_main.get_uvicorn_config()
    assert cfg["app"] == "main:app"
    assert cfg["host"] == "127.0.0.1"
    assert cfg["port"] == 9000
    assert cfg["reload"] is True

    # 2. Production disables reload by default
    monkeypatch.setenv("FASTAPI_ENV", "production")
    cfg_prod = backend_main.get_uvicorn_config()
    assert cfg_prod["reload"] is False

    # 3. Explicit FASTAPI_RELOAD="true" overrides production mode
    monkeypatch.setenv("FASTAPI_RELOAD", "true")
    cfg_override = backend_main.get_uvicorn_config()
    assert cfg_override["reload"] is True

    # 4. Explicit UVICORN_RELOAD="false" disables reload even in development
    monkeypatch.delenv("FASTAPI_RELOAD", raising=False)
    monkeypatch.setenv("UVICORN_RELOAD", "false")
    monkeypatch.setenv("FASTAPI_ENV", "development")
    cfg_dev_disabled = backend_main.get_uvicorn_config()
    assert cfg_dev_disabled["reload"] is False


def test_stream_pace_delay_configuration(monkeypatch):
    """Ensure get_stream_pace_delay returns 0 by default and parses WS_STREAM_PACE_MS safely (#CC-021)."""
    # 1. Unset returns 0.0
    monkeypatch.delenv("WS_STREAM_PACE_MS", raising=False)
    assert backend_main.get_stream_pace_delay() == 0.0

    # 2. Configured positive milliseconds
    monkeypatch.setenv("WS_STREAM_PACE_MS", "50")
    assert backend_main.get_stream_pace_delay() == 0.05

    # 3. Invalid or negative values clamp to 0.0
    monkeypatch.setenv("WS_STREAM_PACE_MS", "-10")
    assert backend_main.get_stream_pace_delay() == 0.0
    monkeypatch.setenv("WS_STREAM_PACE_MS", "invalid_number")
    assert backend_main.get_stream_pace_delay() == 0.0


def test_websocket_streaming_without_artificial_delay(client, monkeypatch):
    """Ensure feedback streaming works without forced sleep and reaches feedback_complete (#CC-021)."""
    monkeypatch.delenv("WS_STREAM_PACE_MS", raising=False)
    backend_main.request_counts.clear()

    with client.websocket_connect("/ws/feedback") as ws:
        ws.send_json({"mentor_id": "ada_lovelace", "user_code": VALID_CODE})
        m_analysis = ws.receive_json()
        assert m_analysis["type"] == "analysis_complete"

        m_chunk = ws.receive_json()
        assert m_chunk["type"] == "feedback_chunk"

        m_complete = ws.receive_json()
        assert m_complete["type"] == "feedback_complete"


def test_database_schema_mentor_id_primary_key_contract():
    """Ensure schema.sql defines mentor_id as primary key matching JSON registry (#CC-023)."""
    from pathlib import Path
    import json

    schema_path = Path(__file__).resolve().parent.parent / "db" / "schema.sql"
    assert schema_path.is_file(), f"Missing schema at {schema_path}"
    schema_sql = schema_path.read_text(encoding="utf-8")

    # 1. mentors table must declare mentor_id as PRIMARY KEY
    assert "mentor_id TEXT PRIMARY KEY" in schema_sql
    assert "avatar_url TEXT" in schema_sql

    # 2. sessions table foreign key must reference mentors(mentor_id)
    assert "REFERENCES mentors(mentor_id)" in schema_sql

    # 3. All JSON personas must provide mentor_id matching the primary key
    mentors_dir = Path(__file__).resolve().parent.parent / "mentors"
    json_files = list(mentors_dir.glob("*.json"))
    assert len(json_files) == 8
    for f in json_files:
        data = json.loads(f.read_text(encoding="utf-8"))
        assert "mentor_id" in data
        assert isinstance(data["mentor_id"], str)
        assert data["mentor_id"] == f.stem


def test_prepare_mentor_record_mapping_and_validation():
    """Ensure prepare_mentor_record validates required fields and filters unknown keys (#CC-024)."""
    import pytest
    from backend.db.seed_mentors import prepare_mentor_record

    raw_data = {
        "mentor_id": "test_mentor",
        "name": "Test Mentor",
        "era": "Present",
        "unknown_extra_field": "ignore_me",
        "nested_unsupported": {"secret": 123},
        "focus_areas": ["python", "testing"],
    }

    record = prepare_mentor_record(raw_data)
    assert record["mentor_id"] == "test_mentor"
    assert record["name"] == "Test Mentor"
    assert record["era"] == "Present"
    assert record["focus_areas"] == ["python", "testing"]
    assert "unknown_extra_field" not in record
    assert "nested_unsupported" not in record

    # Legacy mapping from 'id'
    legacy_data = {"id": "legacy_mentor", "name": "Legacy"}
    legacy_record = prepare_mentor_record(legacy_data)
    assert legacy_record["mentor_id"] == "legacy_mentor"

    # Missing mentor_id
    with pytest.raises(ValueError, match="missing required 'mentor_id'"):
        prepare_mentor_record({"name": "No ID"})

    # Missing name
    with pytest.raises(ValueError, match="missing required 'name'"):
        prepare_mentor_record({"mentor_id": "no_name"})


def test_seed_mentors_with_mock_supabase(tmp_path):
    """Ensure seed_mentors iterates JSON files and executes upsert with clean records (#CC-024)."""
    import json
    from backend.db.seed_mentors import seed_mentors

    # Create dummy mentor files
    mentor_data_1 = {
        "mentor_id": "mentor_alpha",
        "name": "Mentor Alpha",
        "era": "1950",
        "focus_areas": ["logic"],
        "unexpected_key": "drop_this",
    }
    mentor_data_2 = {
        "id": "mentor_beta",
        "name": "Mentor Beta",
        "era": "1980",
    }
    (tmp_path / "mentor_alpha.json").write_text(json.dumps(mentor_data_1), encoding="utf-8")
    (tmp_path / "mentor_beta.json").write_text(json.dumps(mentor_data_2), encoding="utf-8")

    upserted_records = []

    class MockQueryBuilder:
        def __init__(self, record):
            self.record = record

        def execute(self):
            upserted_records.append(self.record)
            return {"data": [self.record]}

    class MockTable:
        def upsert(self, record):
            return MockQueryBuilder(record)

    class MockSupabase:
        def table(self, table_name):
            assert table_name == "mentors"
            return MockTable()

    mock_client = MockSupabase()
    results = seed_mentors(supabase=mock_client, mentors_dir=tmp_path)

    assert len(results) == 2
    assert len(upserted_records) == 2

    # Check that unexpected_key was dropped
    assert "unexpected_key" not in upserted_records[0]
    assert upserted_records[0]["mentor_id"] == "mentor_alpha"
    assert upserted_records[1]["mentor_id"] == "mentor_beta"


def test_seed_mentors_utf8_encoding_multilingual(tmp_path):
    """Ensure seed_mentors opens JSON files with UTF-8 encoding handling unicode/emojis (#CC-033)."""
    import inspect
    import json
    from backend.db.seed_mentors import seed_mentors

    # Verify source contract explicitly specifies encoding="utf-8"
    source = inspect.getsource(seed_mentors)
    assert 'encoding="utf-8"' in source

    # Test reading non-ASCII multilingual content with emojis and accented characters
    unicode_mentor = {
        "mentor_id": "mentor_unicode",
        "name": "Alan Turing — Théorème & Cryptographie 🚀",
        "era": "1940s 🇬🇧",
        "signature_opening": "Bonjour, let’s explore computability!",
        "signature_closing": "« Q.E.D. » 🌟",
    }
    file_path = tmp_path / "unicode_mentor.json"
    file_path.write_text(json.dumps(unicode_mentor, ensure_ascii=False), encoding="utf-8")

    upserted_records = []

    class MockTable:
        def upsert(self, record):
            class MockBuilder:
                def execute(self):
                    upserted_records.append(record)
                    return {"data": [record]}

            return MockBuilder()

    class MockSupabase:
        def table(self, table_name):
            return MockTable()

    records = seed_mentors(supabase=MockSupabase(), mentors_dir=tmp_path)
    assert len(records) == 1
    assert records[0]["name"] == "Alan Turing — Théorème & Cryptographie 🚀"
    assert records[0]["signature_closing"] == "« Q.E.D. » 🌟"



@pytest.mark.asyncio
async def test_session_repo_async_threadpool_execution():
    """Ensure SessionRepository operations offload blocking execution to threadpool (#CC-025)."""
    import threading
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.db.session_repo import SessionRepository, SessionCreate

    execution_threads = set()
    main_thread = threading.current_thread()

    class ThreadTrackingQuery:
        def __init__(self, data):
            self.data = data

        def execute(self):
            execution_threads.add(threading.current_thread())
            return self

    class MockTable:
        def __init__(self, table_name):
            self.table_name = table_name

        def insert(self, payload):
            now = datetime.now(timezone.utc)
            item = dict(payload)
            item["id"] = str(uuid4())
            item["created_at"] = now.isoformat()
            item["updated_at"] = now.isoformat()
            return ThreadTrackingQuery([item])

        def select(self, *args, **kwargs):
            return self

        def eq(self, *args, **kwargs):
            return self

        def order(self, *args, **kwargs):
            return self

        def range(self, *args, **kwargs):
            now = datetime.now(timezone.utc)
            item = {
                "id": str(uuid4()),
                "user_id": str(uuid4()),
                "mentor_id": "ada_lovelace",
                "user_code": "def foo(): pass",
                "language": "python",
                "complexity_score": 1,
                "status": "active",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            return ThreadTrackingQuery([item])

        def limit(self, *args, **kwargs):
            return self.range(0, 0)

        def single(self):
            now = datetime.now(timezone.utc)
            item = {
                "id": str(uuid4()),
                "user_id": str(uuid4()),
                "mentor_id": "ada_lovelace",
                "user_code": "def foo(): pass",
                "language": "python",
                "complexity_score": 1,
                "status": "active",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            return ThreadTrackingQuery(item)

        def update(self, payload):
            return self

    class MockClient:
        def table(self, table_name):
            return MockTable(table_name)

    repo = SessionRepository(client=MockClient())
    user_id = uuid4()

    # 1. create_session offloads to worker thread
    session = await repo.create_session(
        user_id=user_id,
        data=SessionCreate(mentor_id="ada_lovelace", user_code="print('hello')")
    )
    assert session.mentor_id == "ada_lovelace"

    # 2. get_session offloads to worker thread
    found_session = await repo.get_session(session_id=session.id, user_id=user_id)
    assert found_session is not None

    # 3. list_sessions offloads to worker thread
    sessions = await repo.list_sessions(user_id=user_id)
    assert len(sessions) == 1

    # Verify that query execution occurred in separate worker thread(s), not in main asyncio thread
    assert len(execution_threads) > 0
    for t in execution_threads:
        assert t != main_thread, "Query execute() was called synchronously on the event loop thread"


def test_coerce_uuid_and_session_model_anonymous_safety():
    """Ensure coerce_uuid and Session model handle anonymous strings and non-UUID inputs safely (#CC-026)."""
    import uuid
    from datetime import datetime, timezone
    from backend.db.session_repo import coerce_uuid, Session, ANONYMOUS_NAMESPACE

    anon_uuid = uuid.uuid5(ANONYMOUS_NAMESPACE, "anonymous")

    # 1. Anonymous string identifiers map to deterministic anon_uuid
    assert coerce_uuid("anonymous") == anon_uuid
    assert coerce_uuid("anon") == anon_uuid
    assert coerce_uuid("") == anon_uuid
    assert coerce_uuid(None) == anon_uuid

    # 2. Valid UUID passthrough
    random_uuid = uuid.uuid4()
    assert coerce_uuid(random_uuid) == random_uuid
    assert coerce_uuid(str(random_uuid)) == random_uuid

    # 3. Arbitrary non-UUID strings map deterministically without error
    custom_uuid = coerce_uuid("github_oauth_user_98765")
    assert isinstance(custom_uuid, uuid.UUID)
    assert custom_uuid == uuid.uuid5(ANONYMOUS_NAMESPACE, "anonymous.github_oauth_user_98765")

    # 4. Session model validates and coerces string user_id and id without crash
    now = datetime.now(timezone.utc)
    session = Session(
        id="session-string-id",
        user_id="anonymous",
        mentor_id="ada_lovelace",
        user_code="print('hi')",
        language="python",
        created_at=now,
        updated_at=now,
    )
    assert isinstance(session.user_id, uuid.UUID)
    assert session.user_id == anon_uuid
    assert isinstance(session.id, uuid.UUID)


@pytest.mark.asyncio
async def test_session_repo_handles_anonymous_string_user_id():
    """Ensure SessionRepository methods accept string 'anonymous' user_id without ValueError (#CC-026)."""
    from datetime import datetime, timezone
    from backend.db.session_repo import SessionRepository, SessionCreate

    passed_queries = []

    class MockQuery:
        def __init__(self, data):
            self.data = data

        def execute(self):
            return self

    class MockTable:
        def __init__(self, table_name):
            self.table_name = table_name

        def insert(self, payload):
            passed_queries.append(("insert", payload))
            now = datetime.now(timezone.utc)
            item = dict(payload)
            item["id"] = "generated-uuid"
            item["created_at"] = now.isoformat()
            item["updated_at"] = now.isoformat()
            return MockQuery([item])

        def select(self, *args, **kwargs):
            return self

        def eq(self, col, val):
            passed_queries.append(("eq", col, val))
            return self

        def order(self, *args, **kwargs):
            return self

        def range(self, *args, **kwargs):
            now = datetime.now(timezone.utc)
            item = {
                "id": "item-id",
                "user_id": "anonymous",
                "mentor_id": "ada_lovelace",
                "user_code": "x = 1",
                "language": "python",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            return MockQuery([item])

        def limit(self, *args, **kwargs):
            return self.range(0, 0)

        def single(self):
            now = datetime.now(timezone.utc)
            item = {
                "id": "item-id",
                "user_id": "anonymous",
                "mentor_id": "ada_lovelace",
                "user_code": "x = 1",
                "language": "python",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            return MockQuery(item)

    class MockClient:
        def table(self, table_name):
            return MockTable(table_name)

    repo = SessionRepository(client=MockClient())

    # Passing "anonymous" string directly to create_session and list_sessions
    session = await repo.create_session("anonymous", SessionCreate(mentor_id="ada_lovelace", user_code="print('ok')"))
    assert session.mentor_id == "ada_lovelace"

    sessions = await repo.list_sessions("anonymous")
    assert len(sessions) == 1

    found = await repo.get_session("custom-session-id", "anonymous")
    assert found is not None


@pytest.mark.asyncio
async def test_session_repo_get_session_returns_none_on_404_and_pgrst116():
    """Ensure get_session returns None instead of raising on empty rows or PGRST116 (#CC-027)."""
    import pytest
    from backend.db.session_repo import SessionRepository

    # Case 1: Empty rows list [] returned from query
    class MockEmptyQuery:
        def __init__(self):
            self.data = []

        def execute(self):
            return self

    class MockEmptyTable:
        def select(self, *args, **kwargs):
            return self

        def eq(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return MockEmptyQuery()

    class MockEmptyClient:
        def table(self, table_name):
            return MockEmptyTable()

    empty_repo = SessionRepository(client=MockEmptyClient())
    empty_result = await empty_repo.get_session("session-123", "user-456")
    assert empty_result is None

    # Case 2: PostgREST APIError / PGRST116 ("The result contains 0 rows") raised
    class MockPGRST116Query:
        def execute(self):
            raise RuntimeError("APIError: {'code': 'PGRST116', 'details': 'The result contains 0 rows', 'message': 'JSON object requested'}")

    class MockPGRST116Table:
        def select(self, *args, **kwargs):
            return self

        def eq(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return MockPGRST116Query()

    class MockPGRST116Client:
        def table(self, table_name):
            return MockPGRST116Table()

    pgrst_repo = SessionRepository(client=MockPGRST116Client())
    pgrst_result = await pgrst_repo.get_session("session-123", "user-456")
    assert pgrst_result is None

    # Case 3: Unexpected error (e.g. connection refused) is properly re-raised
    class MockFailingQuery:
        def execute(self):
            raise ConnectionError("Database cluster unreachable")

    class MockFailingTable:
        def select(self, *args, **kwargs):
            return self

        def eq(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return MockFailingQuery()

    class MockFailingClient:
        def table(self, table_name):
            return MockFailingTable()

    failing_repo = SessionRepository(client=MockFailingClient())
    with pytest.raises(ConnectionError, match="Database cluster unreachable"):
        await failing_repo.get_session("session-123", "user-456")


@pytest.mark.asyncio
async def test_session_repo_timezone_aware_utc_timestamps():
    """Ensure update_session and complete_session produce timezone-aware UTC timestamps (#CC-028)."""
    from datetime import datetime, timezone
    from backend.db.session_repo import SessionRepository, SessionUpdate

    captured_payloads = []

    class MockUpdateQuery:
        def __init__(self, payload):
            self.payload = payload

        def execute(self):
            now = datetime.now(timezone.utc)
            item = {
                "id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "mentor_id": "ada_lovelace",
                "user_code": "def test(): pass",
                "language": "python",
                "status": self.payload.get("status", "active"),
                "created_at": now.isoformat(),
                "updated_at": self.payload.get("updated_at", now.isoformat()),
                "completed_at": self.payload.get("completed_at"),
            }
            return MockUpdateQuery([item])

        @property
        def data(self):
            now = datetime.now(timezone.utc)
            return [{
                "id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "mentor_id": "ada_lovelace",
                "user_code": "def test(): pass",
                "language": "python",
                "status": self.payload.get("status", "active"),
                "created_at": now.isoformat(),
                "updated_at": self.payload.get("updated_at", now.isoformat()),
                "completed_at": self.payload.get("completed_at"),
            }]

    class MockTable:
        def update(self, payload):
            captured_payloads.append(payload)
            return self

        def eq(self, col, val):
            return self

        def execute(self):
            return MockUpdateQuery(captured_payloads[-1] if captured_payloads else {})

    class MockClient:
        def table(self, table_name):
            return MockTable()

    repo = SessionRepository(client=MockClient())

    # 1. Test update_session sets updated_at with timezone-aware ISO string or datetime
    updated = await repo.update_session("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", SessionUpdate(status="active"))
    assert updated is not None
    assert len(captured_payloads) == 1
    updated_at_val = captured_payloads[0]["updated_at"]
    if isinstance(updated_at_val, str):
        parsed_updated_at = datetime.fromisoformat(updated_at_val)
        assert parsed_updated_at.tzinfo is not None, "updated_at must be timezone-aware"
    else:
        assert isinstance(updated_at_val, datetime)
        assert updated_at_val.tzinfo is not None, "updated_at must be timezone-aware"

    # 2. Test complete_session sets completed_at with timezone-aware datetime
    completed = await repo.complete_session("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222")
    assert completed is not None
    assert len(captured_payloads) == 2
    completed_at_val = captured_payloads[1]["completed_at"]
    assert isinstance(completed_at_val, datetime)
    assert completed_at_val.tzinfo is not None, "completed_at must be timezone-aware"


@pytest.mark.asyncio
async def test_session_repo_update_session_consistent_datetime_model():
    """Ensure SessionUpdate models updated_at as datetime matching Session model schema (#CC-034)."""
    from datetime import datetime, timezone
    from backend.db.session_repo import SessionRepository, SessionUpdate

    captured = []

    class MockTable:
        def update(self, payload):
            captured.append(payload)
            return self

        def eq(self, *args):
            return self

        def execute(self):
            now = datetime.now(timezone.utc)
            item = {
                "id": "11111111-1111-1111-1111-111111111111",
                "user_id": "22222222-2222-2222-2222-222222222222",
                "mentor_id": "grace_hopper",
                "user_code": "code",
                "language": "python",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

            class Result:
                data = [item]

            return Result()

    class MockClient:
        def table(self, _):
            return MockTable()

    repo = SessionRepository(client=MockClient())
    custom_dt = datetime(2026, 11, 16, 12, 0, tzinfo=timezone.utc)
    update = SessionUpdate(status="active", updated_at=custom_dt)
    assert update.updated_at == custom_dt

    await repo.update_session("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", update)
    assert len(captured) == 1
    assert captured[0]["updated_at"] == custom_dt


def test_schema_user_profile_sync_trigger_contract():
    """Ensure schema.sql declares public.handle_new_user and on_auth_user_created trigger (#CC-029)."""
    from pathlib import Path

    schema_path = Path(__file__).resolve().parent.parent / "db" / "schema.sql"
    assert schema_path.is_file(), f"Missing schema at {schema_path}"
    schema_sql = schema_path.read_text(encoding="utf-8")

    # 1. Trigger function declaration and security definer
    assert "CREATE OR REPLACE FUNCTION public.handle_new_user()" in schema_sql
    assert "SECURITY DEFINER" in schema_sql

    # 2. Trigger on auth.users table
    assert "CREATE TRIGGER on_auth_user_created" in schema_sql
    assert "ON auth.users" in schema_sql
    assert "EXECUTE FUNCTION public.handle_new_user()" in schema_sql

    # 3. Synchronized columns into public.users
    assert "INSERT INTO public.users (id, email, display_name, avatar_url)" in schema_sql
    assert "ON CONFLICT (id) DO UPDATE" in schema_sql


def test_schema_composite_index_and_delete_policies_contract():
    """Ensure schema.sql defines composite index idx_sessions_id_user and delete RLS policies (#CC-030)."""
    from pathlib import Path

    schema_path = Path(__file__).resolve().parent.parent / "db" / "schema.sql"
    assert schema_path.is_file(), f"Missing schema at {schema_path}"
    schema_sql = schema_path.read_text(encoding="utf-8")

    # 1. Composite index to optimize messages RLS subqueries
    assert "CREATE INDEX IF NOT EXISTS idx_sessions_id_user ON sessions(id, user_id);" in schema_sql

    # 2. DELETE policies for sessions and messages
    assert 'CREATE POLICY "Users can delete own sessions" ON sessions' in schema_sql
    assert "FOR DELETE USING (auth.uid() = user_id);" in schema_sql

    assert 'CREATE POLICY "Users can delete messages in own sessions" ON messages' in schema_sql
    assert "FOR DELETE USING (" in schema_sql
    assert "sessions.id = messages.session_id" in schema_sql
    assert "sessions.user_id = auth.uid()" in schema_sql


def test_session_repo_auth_keys_and_roles_contract(monkeypatch, caplog):
    """Ensure SessionRepository distinguishes admin role, anon fallback, and user scoped tokens (#CC-031)."""
    import logging
    from backend.db.session_repo import SessionRepository, get_session_repo

    class MockPostgrest:
        def __init__(self):
            self.authed_token = None

        def auth(self, token: str):
            self.authed_token = token
            return self

    class MockSupabaseClient:
        def __init__(self):
            self.postgrest = MockPostgrest()

    mock_client = MockSupabaseClient()

    # 1. Direct injection with jwt_token calls set_auth
    repo = SessionRepository(client=mock_client, jwt_token="custom-jwt-token")
    assert repo.jwt_token == "custom-jwt-token"
    assert mock_client.postgrest.authed_token == "custom-jwt-token"

    # 2. Test create_admin factory vs create_for_user factory
    admin_repo = SessionRepository(client=mock_client, use_service_role=True)
    assert admin_repo.is_service_role is True

    user_repo = SessionRepository(client=mock_client, use_service_role=False, jwt_token="token-abc")
    assert user_repo.is_service_role is False
    assert user_repo.jwt_token == "token-abc"

    # 3. Test env key resolution: service role key configured
    captured_creates = []

    def mock_create_client(url, key):
        captured_creates.append((url, key))
        return MockSupabaseClient()

    monkeypatch.setattr("backend.db.session_repo.create_client", mock_create_client)
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key-123")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key-456")

    admin = SessionRepository.create_admin()
    assert admin.is_service_role is True
    assert captured_creates[-1] == ("https://test.supabase.co", "service-key-123")

    # 4. Service role missing, falls back to anon key with warning
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with caplog.at_level(logging.WARNING):
        fallback_admin = SessionRepository.create_admin()
        assert fallback_admin.is_service_role is False
        assert captured_creates[-1] == ("https://test.supabase.co", "anon-key-456")
        assert any("SUPABASE_SERVICE_ROLE_KEY not configured" in record.message for record in caplog.records)

    # 5. create_for_user uses anon key and sets auth token
    user_inst = SessionRepository.create_for_user("jwt-xyz")
    assert user_inst.is_service_role is False
    assert user_inst.jwt_token == "jwt-xyz"
    assert user_inst.client.postgrest.authed_token == "jwt-xyz"

    # 6. get_session_repo with jwt returns scoped repo
    scoped = get_session_repo(jwt_token="user-jwt")
    assert scoped.jwt_token == "user-jwt"


def test_schema_sessions_user_created_index_contract():
    """Ensure schema.sql defines composite index idx_sessions_user_created on sessions(user_id, created_at DESC) (#CC-032)."""
    from pathlib import Path

    schema_path = Path(__file__).resolve().parent.parent / "db" / "schema.sql"
    assert schema_path.is_file(), f"Missing schema at {schema_path}"
    schema_sql = schema_path.read_text(encoding="utf-8")

    assert "CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at DESC);" in schema_sql


@pytest.mark.asyncio
async def test_session_repo_get_messages_sequential_order_contract():
    """Ensure get_messages applies order('sequence', desc=False) and checks ownership (#CC-035)."""
    from datetime import datetime, timezone
    from backend.db.session_repo import SessionRepository

    calls = []

    class MockMessagesQuery:
        def __init__(self, table_name):
            self.table_name = table_name

        def select(self, *args):
            calls.append(("select", args))
            return self

        def eq(self, col, val):
            calls.append(("eq", col, val))
            return self

        def order(self, col, desc=False):
            calls.append(("order", col, desc))
            return self

        def limit(self, val):
            calls.append(("limit", val))
            return self

        def execute(self):
            now = datetime.now(timezone.utc).isoformat()
            if calls and calls[-1] == ("limit", 1):
                return type("Result", (), {"data": [{"sequence": 42}]})()
            return type(
                "Result",
                (),
                {
                    "data": [
                        {
                            "id": "33333333-3333-3333-3333-333333333333",
                            "session_id": "11111111-1111-1111-1111-111111111111",
                            "role": "user",
                            "content": {"text": "hello"},
                            "sequence": 1,
                            "created_at": now,
                        },
                        {
                            "id": "44444444-4444-4444-4444-444444444444",
                            "session_id": "11111111-1111-1111-1111-111111111111",
                            "role": "assistant",
                            "content": {"text": "welcome"},
                            "sequence": 2,
                            "created_at": now,
                        },
                    ]
                },
            )()

    class MockSessionsQuery:
        def select(self, *args):
            return self

        def eq(self, *args):
            return self

        def limit(self, *args):
            return self

        def execute(self):
            now = datetime.now(timezone.utc).isoformat()
            return type(
                "Result",
                (),
                {
                    "data": [
                        {
                            "id": "11111111-1111-1111-1111-111111111111",
                            "user_id": "22222222-2222-2222-2222-222222222222",
                            "mentor_id": "ada_lovelace",
                            "user_code": "x = 1",
                            "language": "python",
                            "status": "active",
                            "created_at": now,
                            "updated_at": now,
                        }
                    ]
                },
            )()

    class MockClient:
        def table(self, table_name):
            if table_name == "messages":
                return MockMessagesQuery("messages")
            return MockSessionsQuery()

    repo = SessionRepository(client=MockClient())

    # 1. Test get_messages returns ordered messages
    msgs = await repo.get_messages(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
    )
    assert len(msgs) == 2
    assert msgs[0].sequence == 1
    assert msgs[1].sequence == 2
    assert ("order", "sequence", False) in calls

    # 2. Test get_last_sequence
    last_seq = await repo.get_last_sequence("11111111-1111-1111-1111-111111111111")
    assert last_seq == 42
    assert ("order", "sequence", True) in calls
    assert ("limit", 1) in calls
























