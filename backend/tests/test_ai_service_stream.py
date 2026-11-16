"""
Streaming decoder tests for AIGateway.get_feedback_streaming.

Regression coverage for two transport/decoding bugs:

1. The old aiohttp decoder called json.loads() on each raw TCP chunk, so
   any chunk not aligned to a JSON boundary was silently dropped. The fix
   buffers bytes and parses complete SSE events (regression test splits the
   stream at every byte boundary).

2. The old raw_decode loop could not emit anything until the whole
   MentorFeedback object closed, defeating real-time streaming. The fix
   extracts partial fields as they grow — unterminated strings yield their
   decoded prefix, and arrays yield completed elements.

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
        self._captured_url["kwargs"] = kwargs
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
async def test_multiple_fragments_in_single_chunk_yield_progressive_partials(monkeypatch):
    """Two fragments of one object inside a single TCP chunk: the client sees
    the partial reading first, then the completed object."""
    events = (
        model_event('{"reading": "One", "sec')
        + model_event('tions": [], "challenge": "", "closing": ""}')
    )
    patch_session(monkeypatch, FakeResponse([events]), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]
    assert payloads == [
        {"reading": "One"},
        {"reading": "One", "sections": [], "challenge": "", "closing": ""},
    ]


@pytest.mark.asyncio
async def test_one_fragment_per_chunk_yields_progressive_partials(monkeypatch):
    events = [
        model_event('{"reading": "A", "sections": [{"id": "harmonies", '),
        model_event('"label": "Harmonies", "icon": "✨", "content": "Base case."}], '),
        model_event('"challenge": "Memoize.", "closing": "Done."}'),
    ]
    patch_session(monkeypatch, FakeResponse(events), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]

    # Progressive typewriter-style growth
    assert payloads[0] == {"reading": "A", "sections": []}
    assert payloads[1]["sections"][0]["label"] == "Harmonies"
    assert "challenge" not in payloads[1]
    # Final payload is the complete object
    assert payloads[-1] == {
        "reading": "A",
        "sections": [
            {"id": "harmonies", "label": "Harmonies", "icon": "✨", "content": "Base case."}
        ],
        "challenge": "Memoize.",
        "closing": "Done.",
    }


@pytest.mark.asyncio
async def test_text_fragments_accumulate_progressively(monkeypatch):
    """Partial JSON text across events streams out as it grows instead of
    waiting for the closing brace (the raw_decode deadlock fix)."""
    events = [
        model_event('{"reading": "Hel'),
        model_event('lo ", "sections": [], "challenge": "", '),
        model_event('"closing": ""}'),
    ]
    patch_session(monkeypatch, FakeResponse(events), {})

    chunks = await collect(make_gateway())
    payloads = [c["payload"] for c in chunks if c["type"] == "feedback_chunk"]

    # Typewriter growth of the reading field
    assert payloads[0] == {"reading": "Hel"}
    assert payloads[1]["reading"] == "Hello "
    # Final payload is the complete object
    assert payloads[-1] == {
        "reading": "Hello ",
        "sections": [],
        "challenge": "",
        "closing": "",
    }


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


# ---------------------------------------------------------------------------
# extract_partial_feedback unit coverage (the raw_decode deadlock fix)
# ---------------------------------------------------------------------------

def test_partial_object_extraction_grows_with_input():
    from backend.services.ai_service import extract_partial_feedback

    full = '{"reading": "Hello world", "sections": [], "challenge": "", "closing": ""}'
    # At every prefix length the reading prefix decodes cleanly
    for end in range(13, len(full)):
        partial = extract_partial_feedback(full[:end])
        assert "reading" in partial
        assert full[12:13] not in partial["reading"] or partial["reading"] == ""

    assert extract_partial_feedback(full) == json.loads(full)


def test_partial_string_trims_incomplete_escape():
    from backend.services.ai_service import extract_partial_feedback

    # Lone trailing backslash is an incomplete escape — trimmed.
    assert extract_partial_feedback('{"reading": "abc\\')['reading'] == "abc"
    # Complete escaped characters decode.
    assert extract_partial_feedback('{"reading": "a\\"b')['reading'] == 'a"b'
    assert extract_partial_feedback('{"reading": "a\\\\b')['reading'] == "a\\b"
    assert extract_partial_feedback('{"reading": "a\\nb')['reading'] == "a\nb"
    assert extract_partial_feedback('{"reading": "caf\\u00e9')['reading'] == "café"
    # Incomplete \u escape is trimmed, not garbage.
    assert extract_partial_feedback('{"reading": "caf\\u00')['reading'] == "caf"


def test_partial_array_yields_completed_elements_only():
    from backend.services.ai_service import extract_partial_feedback

    text = '{"reading": "", "sections": [{"id": "a", "label": "A", "icon": "x", "content": "one"}, {"id": "b"'
    partial = extract_partial_feedback(text)
    assert partial["sections"] == [
        {"id": "a", "label": "A", "icon": "x", "content": "one"}
    ]


def test_partial_object_stops_at_incomplete_value():
    from backend.services.ai_service import extract_partial_feedback

    # challenge is complete; the unterminated closing string still yields its
    # decoded prefix (typewriter), while a value that cannot start at all is
    # simply omitted.
    text = '{"reading": "r", "sections": [], "challenge": "try it", "closing": "half'
    partial = extract_partial_feedback(text)
    assert partial == {
        "reading": "r",
        "sections": [],
        "challenge": "try it",
        "closing": "half",
    }

    # A literal cut in half (e.g. `tru`) is omitted until complete.
    assert extract_partial_feedback('{"reading": "r", "n": tru') == {"reading": "r"}


def test_partial_object_handles_empty_and_whitespace():
    from backend.services.ai_service import extract_partial_feedback

    assert extract_partial_feedback("") == {}
    assert extract_partial_feedback("   ") == {}
    assert extract_partial_feedback("[1, 2]") == {}  # not an object
    assert extract_partial_feedback("{") == {}
    assert extract_partial_feedback('{"reading"') == {}
    assert extract_partial_feedback('{"reading":') == {}


def test_build_response_schema_mentor_specific():
    gateway = make_gateway()
    turing = gateway.mentors["alan_turing"]
    turing_schema = gateway._build_response_schema(turing)

    assert turing_schema["type"] == "OBJECT"
    assert turing_schema["required"] == ["reading", "sections", "challenge", "closing"]
    sec_id_prop = turing_schema["properties"]["sections"]["items"]["properties"]["id"]
    assert sec_id_prop["type"] == "STRING"
    assert sec_id_prop["enum"] == ["termination", "complexity", "beauty", "alternative"]

    linus = gateway.mentors["linus_torvalds"]
    linus_schema = gateway._build_response_schema(linus)
    linus_sec_id_prop = linus_schema["properties"]["sections"]["items"]["properties"]["id"]
    assert linus_sec_id_prop["enum"] == [
        "does_it_work",
        "whats_broken",
        "how_it_should_be",
        "summary",
    ]


def test_build_response_schema_fallback_when_no_sections():
    from backend.services.ai_service import MentorConfig

    gateway = make_gateway()
    dummy_config = MentorConfig(
        mentor_id="custom_mentor",
        name="Custom Mentor",
        era="2026",
        icon="🚀",
        accent_color="#000000",
        system_prompt="Prompt",
        tone="direct",
        focus_areas=["speed"],
        feedback_schema={},
        few_shot_examples=[],
        signature_opening="Hello",
        signature_closing="Bye",
    )
    schema = gateway._build_response_schema(dummy_config)
    sec_id_prop = schema["properties"]["sections"]["items"]["properties"]["id"]
    assert sec_id_prop["type"] == "STRING"
    assert "enum" not in sec_id_prop


def test_build_prompt_includes_mentor_sections():
    gateway = make_gateway()
    turing = gateway.mentors["alan_turing"]
    prompt = gateway._build_prompt(turing, user_code="x = 1", code_analysis={})

    assert "Required review sections:" in prompt
    assert "termination" in prompt
    assert "Termination Conditions" in prompt
    assert "complexity" in prompt
    assert "Computational Complexity" in prompt


@pytest.mark.asyncio
async def test_get_feedback_streaming_passes_dynamic_response_schema(monkeypatch):
    gateway = make_gateway()
    payload = {"reading": "Ok", "sections": [], "challenge": "", "closing": ""}
    response = FakeResponse([model_event(json.dumps(payload))])
    captured = {}
    patch_session(monkeypatch, response, captured)

    chunks = await collect(gateway, mentor_id="alan_turing")
    assert any(c["type"] == "feedback_chunk" for c in chunks)

    sent_payload = captured.get("kwargs", {}).get("json", {})
    gen_config = sent_payload.get("generationConfig", {})
    response_schema = gen_config.get("responseSchema", {})
    sec_id_prop = response_schema["properties"]["sections"]["items"]["properties"]["id"]
    assert sec_id_prop["enum"] == ["termination", "complexity", "beauty", "alternative"]
