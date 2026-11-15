"""
Streaming decoder tests for AIGateway.get_feedback_streaming.

Regression coverage for the aiohttp raw-chunk JSON decoder bug: the old
implementation called json.loads() on each raw TCP chunk, so any chunk that
did not end on a JSON boundary threw JSONDecodeError and was silently
dropped. The fixed implementation buffers bytes and parses complete SSE
events, so arbitrary chunk splits never lose data.

Run: python -m pytest backend/tests -v
"""

import json

import pytest

import backend.services.ai_service as ai_service
from backend.services.ai_service import AIGateway


def sse_event(obj: dict) -> bytes:
    return f"data: {json.dumps(obj)}\n\n".encode("utf-8")


def model_event(text: str) -> bytes:
    return sse_event({"candidates": [{"content": {"parts": [{"text": text}]}}]})


class FakeContent:
    def __init__(self, chunks):
        self._chunks = list(chunks)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._chunks:
            raise StopAsyncIteration
        return self._chunks.pop(0)


class FakeResponse:
    def __init__(self, chunks, status=200):
        self.status = status
        self.content = FakeContent(chunks)

    async def text(self):
        return "upstream error body"

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


class FakeSession:
    def __init__(self, response, captured_url):
        self._response = response
        self._captured_url = captured_url

    def post(self, url, **kwargs):
        self._captured_url["url"] = url
        return self._response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


def make_gateway() -> AIGateway:
    return AIGateway(api_key="test-key-not-used")


def patch_session(monkeypatch, response, captured_url):
    def factory(*args, **kwargs):
        return FakeSession(response, captured_url)

    monkeypatch.setattr(ai_service.aiohttp, "ClientSession", factory)


async def collect(gateway, mentor_id="ada_lovelace"):
    chunks = []
    async for chunk in gateway.get_feedback_streaming(
        mentor_id=mentor_id, user_code="print('hi')", code_analysis={}
    ):
        chunks.append(chunk)
    return chunks


# ---------------------------------------------------------------------------
# Transport correctness: no packets dropped regardless of chunk boundaries
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_complete_json_split_across_arbitrary_chunk_boundaries(monkeypatch):
    """The core regression: split the SSE stream at every byte boundary."""
    payload = {"reading": "Hello", "sections": [], "challenge": "", "closing": ""}
    stream = model_event(json.dumps(payload))

    for split in range(1, len(stream)):
        response = FakeResponse([stream[:split], stream[split:]])
        captured = {}
        patch_session(monkeypatch, response, captured)

        chunks = await collect(make_gateway())
        payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
        assert payloads == [payload], f"dropped/corrupted data at split={split}"


@pytest.mark.asyncio
async def test_multiple_events_in_single_chunk(monkeypatch):
    events = (
        model_event('{"reading": "One", "sec')
        + model_event('tions": [], "challenge": "", "closing": ""}')
        + model_event('{"reading": "Two", "sections": [], "challenge": "", "closing": ""}')
    )
    patch_session(monkeypatch, FakeResponse([events]), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert payloads == [
        {"reading": "One", "sections": [], "challenge": "", "closing": ""},
        {"reading": "Two", "sections": [], "challenge": "", "closing": ""},
    ]


@pytest.mark.asyncio
async def test_one_event_per_chunk(monkeypatch):
    events = [
        model_event('{"reading": "A", "sections": [], "challenge": "", "closing": ""}'),
        model_event('{"reading": "B", "sections": [], "challenge": "", "closing": ""}'),
        model_event('{"reading": "C", "sections": [], "challenge": "", "closing": ""}'),
    ]
    patch_session(monkeypatch, FakeResponse(events), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert [p["reading"] for p in payloads] == ["A", "B", "C"]


@pytest.mark.asyncio
async def test_text_fragments_accumulate_until_complete(monkeypatch):
    """Partial JSON text across events only yields once a full object exists."""
    events = [
        model_event('{"reading": "Hel'),
        model_event('lo ", "sections": [], "challenge": "", '),
        model_event('"closing": ""}'),
    ]
    patch_session(monkeypatch, FakeResponse(events), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert payloads == [
        {"reading": "Hello ", "sections": [], "challenge": "", "closing": ""}
    ]


@pytest.mark.asyncio
async def test_trailing_event_without_blank_line_is_flushed(monkeypatch):
    stream = model_event('{"reading": "x", "sections": [], "challenge": "", "closing": ""}')
    # Strip the trailing blank line so only the final flush can parse it.
    patch_session(monkeypatch, FakeResponse([stream.rstrip(b"\n")]), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert payloads == [
        {"reading": "x", "sections": [], "challenge": "", "closing": ""}
    ]


@pytest.mark.asyncio
async def test_sse_comment_and_done_sentinel_ignored(monkeypatch):
    keepalive = b": ping\n\n"
    done = b"data: [DONE]\n\n"
    event = model_event('{"reading": "z", "sections": [], "challenge": "", "closing": ""}')
    patch_session(monkeypatch, FakeResponse([keepalive, done, event]), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert payloads == [
        {"reading": "z", "sections": [], "challenge": "", "closing": ""}
    ]


@pytest.mark.asyncio
async def test_empty_stream_yields_nothing(monkeypatch):
    patch_session(monkeypatch, FakeResponse([b"", b": only comments\n\n"]), {})

    chunks = await collect(make_gateway())
    assert chunks == []


# ---------------------------------------------------------------------------
# Request shape
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_uses_sse_endpoint(monkeypatch):
    captured = {}
    patch_session(monkeypatch, FakeResponse([model_event('{"reading": "q", "sections": [], "challenge": "", "closing": ""}')]), captured)

    await collect(make_gateway())
    assert "alt=sse" in captured["url"]
    assert "streamGenerateContent" in captured["url"]


@pytest.mark.asyncio
async def test_non_200_raises_with_body(monkeypatch):
    patch_session(monkeypatch, FakeResponse([b"irrelevant"], status=429), {})

    gateway = make_gateway()
    with pytest.raises(Exception, match="HTTP 429.*upstream error body"):
        async for _ in gateway.get_feedback_streaming(
            mentor_id="ada_lovelace", user_code="x", code_analysis={}
        ):
            pass


@pytest.mark.asyncio
async def test_unknown_mentor_raises(monkeypatch):
    patch_session(monkeypatch, FakeResponse([]), {})
    gateway = make_gateway()
    with pytest.raises(ValueError, match="Unknown mentor"):
        async for _ in gateway.get_feedback_streaming(
            mentor_id="ghost", user_code="x", code_analysis={}
        ):
            pass


# ---------------------------------------------------------------------------
# _extract_sse_text unit coverage
# ---------------------------------------------------------------------------

def test_extract_sse_text_ignores_comments_and_done():
    assert AIGateway._extract_sse_text(": keepalive") == ""
    assert AIGateway._extract_sse_text("data: [DONE]") == ""
    assert AIGateway._extract_sse_text("event: message\ndata: {}") == ""


def test_extract_sse_text_concatenates_parts():
    event = 'data: {"candidates": [{"content": {"parts": [{"text": "a"}, {"text": "b"}]}}]}'
    assert AIGateway._extract_sse_text(event) == "ab"


def test_extract_sse_text_tolerates_malformed_json():
    assert AIGateway._extract_sse_text("data: {not json") == ""