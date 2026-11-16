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
    assert response.json()["status"] == "ok"


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

    res = client.get("/api/mentors", headers={"Authorization": "Bearer any-token"})
    assert res.status_code == 500
    assert "SUPABASE_JWT_SECRET required in production" in res.json()["detail"]


def test_verify_jwt_token_production_validates_token(client, monkeypatch):
    """Ensure valid tokens are decoded and invalid tokens rejected with HTTP 401 in production (#CC-008)."""
    from jose import jwt

    secret = "test-secret-key-for-jwt-verification-12345"
    monkeypatch.setenv("FASTAPI_ENV", "production")
    monkeypatch.setattr(backend_main, "SUPABASE_JWT_SECRET", secret)

    valid_token = jwt.encode({"sub": "user_123", "aud": "authenticated"}, secret, algorithm="HS256")
    invalid_token = jwt.encode({"sub": "user_123", "aud": "wrong_audience"}, "wrong_secret", algorithm="HS256")

    # Valid token succeeds
    res_valid = client.get("/api/mentors", headers={"Authorization": f"Bearer {valid_token}"})
    assert res_valid.status_code == 200

    # Invalid token fails with 401
    res_invalid = client.get("/api/mentors", headers={"Authorization": f"Bearer {invalid_token}"})
    assert res_invalid.status_code == 401
    assert "Invalid token" in res_invalid.json()["detail"]


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




