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
