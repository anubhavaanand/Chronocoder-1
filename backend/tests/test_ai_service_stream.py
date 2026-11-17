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
        self._responses = list(response) if isinstance(response, list) else [response]
        self._captured_url = captured_url
        self.call_count = 0

    def post(self, url, **kwargs):
        self.call_count += 1
        self._captured_url["url"] = url
        self._captured_url["kwargs"] = kwargs
        self._captured_url["call_count"] = self.call_count
        item = self._responses.pop(0) if len(self._responses) > 1 else self._responses[0]
        if isinstance(item, Exception):
            raise item
        return item

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


def make_gateway(**kwargs) -> AIGateway:
    return AIGateway(api_key="test-key-not-used", **kwargs)


def patch_session(monkeypatch, response, captured_url):
    def factory(*args, **kwargs):
        return FakeSession(response, captured_url)

    monkeypatch.setattr(ai_service.aiohttp, "ClientSession", factory)


async def collect(gateway, mentor_id="ada_lovelace", code_analysis=None):
    if code_analysis is None:
        code_analysis = {}
    chunks = []
    async for chunk in gateway.get_feedback_streaming(
        mentor_id=mentor_id, user_code="print('hi')", code_analysis=code_analysis
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


@pytest.mark.asyncio
async def test_api_key_passed_in_headers_not_url(monkeypatch):
    """Ensure Gemini API key is passed via x-goog-api-key header and not leaked in URL (#CC-004)."""
    custom_secret = "secret-gemini-token-xyz-12345"
    gateway = AIGateway(api_key=custom_secret)
    payload = {"reading": "Ok", "sections": [], "challenge": "", "closing": ""}
    response = FakeResponse([model_event(json.dumps(payload))])
    captured = {}
    patch_session(monkeypatch, response, captured)

    await collect(gateway, mentor_id="ada_lovelace")

    # API key must not appear in the URL
    request_url = captured.get("url", "")
    assert custom_secret not in request_url
    assert "key=" not in request_url
    assert request_url.endswith("/gemini-2.0-flash:streamGenerateContent?alt=sse")

    # API key must be securely supplied in the x-goog-api-key request header
    headers = captured.get("kwargs", {}).get("headers", {})
    assert headers.get("x-goog-api-key") == custom_secret
    assert headers.get("Content-Type") == "application/json"


@pytest.mark.asyncio
async def test_retry_on_429_then_succeeds(monkeypatch):
    """Verify exponential backoff retry on HTTP 429 recovers when subsequent call succeeds (#CC-005)."""
    gateway = AIGateway(api_key="test-key", max_retries=3, retry_delay=0.01)
    payload = {"reading": "Recovered", "sections": [], "challenge": "", "closing": ""}
    responses = [
        FakeResponse([], status=429),
        FakeResponse([model_event(json.dumps(payload))], status=200),
    ]
    captured = {}
    patch_session(monkeypatch, responses, captured)

    chunks = await collect(gateway, mentor_id="ada_lovelace")
    assert captured.get("call_count") == 2
    assert any(c["payload"].get("reading") == "Recovered" for c in chunks if c["type"] == "feedback_chunk")


@pytest.mark.asyncio
async def test_retry_on_503_then_succeeds(monkeypatch):
    """Verify retry on HTTP 503 recovers when subsequent call succeeds (#CC-005)."""
    gateway = AIGateway(api_key="test-key", max_retries=3, retry_delay=0.01)
    payload = {"reading": "Back online", "sections": [], "challenge": "", "closing": ""}
    responses = [
        FakeResponse([], status=503),
        FakeResponse([model_event(json.dumps(payload))], status=200),
    ]
    captured = {}
    patch_session(monkeypatch, responses, captured)

    chunks = await collect(gateway, mentor_id="ada_lovelace")
    assert captured.get("call_count") == 2
    assert any(c["payload"].get("reading") == "Back online" for c in chunks if c["type"] == "feedback_chunk")


@pytest.mark.asyncio
async def test_retry_on_connection_error_then_succeeds(monkeypatch):
    """Verify retry on client connection error recovers on subsequent call (#CC-005)."""
    gateway = AIGateway(api_key="test-key", max_retries=3, retry_delay=0.01)
    payload = {"reading": "Connected", "sections": [], "challenge": "", "closing": ""}
    responses = [
        ai_service.aiohttp.ClientConnectionError("Connection reset"),
        FakeResponse([model_event(json.dumps(payload))], status=200),
    ]
    captured = {}
    patch_session(monkeypatch, responses, captured)

    chunks = await collect(gateway, mentor_id="ada_lovelace")
    assert captured.get("call_count") == 2
    assert any(c["payload"].get("reading") == "Connected" for c in chunks if c["type"] == "feedback_chunk")


@pytest.mark.asyncio
async def test_exhaust_retries_raises_on_persistent_429(monkeypatch):
    """Verify that persistent 429 raises after max_retries attempts (#CC-005)."""
    gateway = AIGateway(api_key="test-key", max_retries=2, retry_delay=0.01)
    responses = [
        FakeResponse([], status=429),
        FakeResponse([], status=429),
        FakeResponse([], status=429),
    ]
    captured = {}
    patch_session(monkeypatch, responses, captured)

    with pytest.raises(Exception, match=r"Gemini API error \(HTTP 429\)"):
        await collect(gateway, mentor_id="ada_lovelace")

    assert captured.get("call_count") == 3


@pytest.mark.asyncio
async def test_no_retry_on_400_bad_request(monkeypatch):
    """Non-retryable status (HTTP 400) should immediately raise without wasting retries (#CC-005)."""
    gateway = AIGateway(api_key="test-key", max_retries=3, retry_delay=0.01)
    responses = [FakeResponse([], status=400)]
    captured = {}
    patch_session(monkeypatch, responses, captured)

    with pytest.raises(Exception, match=r"Gemini API error \(HTTP 400\)"):
        await collect(gateway, mentor_id="ada_lovelace")

    assert captured.get("call_count") == 1


def test_load_mentor_registry_utf8_encoding(monkeypatch):
    """Verify _load_mentor_registry loads files using utf-8 encoding (#CC-006)."""
    opened_encodings = []
    real_open = open

    def tracking_open(path, mode="r", *args, **kwargs):
        opened_encodings.append(kwargs.get("encoding"))
        return real_open(path, mode, *args, **kwargs)

    monkeypatch.setattr("builtins.open", tracking_open)
    gateway = make_gateway()
    assert len(gateway.mentors) > 0
    assert all(enc == "utf-8" for enc in opened_encodings)
    # Check that unicode emojis loaded accurately
    assert gateway.mentors["ada_lovelace"].icon == "🔮"
    assert gateway.mentors["alan_turing"].icon == "🧠"


def test_load_mentor_registry_skips_malformed_file(tmp_path, monkeypatch):
    """A malformed mentor JSON file is skipped, not fatal to startup (#252)."""
    good = {
        "mentor_id": "good_mentor",
        "name": "Good",
        "era": "now",
        "icon": "G",
        "accent_color": "#ffffff",
        "avatar_url": "/good.jpg",
        "system_prompt": "You are good.",
        "tone": "warm",
        "focus_areas": ["loops"],
        "feedback_schema": {"sections": []},
        "few_shot_examples": [],
        "signature_opening": "Hello",
        "signature_closing": "Goodbye",
    }
    (tmp_path / "good.json").write_text(json.dumps(good), encoding="utf-8")
    (tmp_path / "broken.json").write_text("{ not valid json", encoding="utf-8")

    mentors = ai_service.load_mentor_registry(tmp_path)
    assert "good_mentor" in mentors
    # The broken file must not appear and must not raise.
    assert len(mentors) == 1


def test_calculate_max_output_tokens_tiered_by_complexity(monkeypatch):
    """Verify _calculate_max_output_tokens tiers tokens based on code complexity and env (#CC-020)."""
    gateway = make_gateway()

    # 1. Default without analysis
    assert gateway._calculate_max_output_tokens(None) == 2048
    assert gateway._calculate_max_output_tokens({}) == 2048

    # 2. Low complexity (<= 3)
    assert gateway._calculate_max_output_tokens({"complexity_score": 1}) == 1536
    assert gateway._calculate_max_output_tokens({"complexity_score": 3}) == 1536

    # 3. Medium complexity (4-7)
    assert gateway._calculate_max_output_tokens({"complexity_score": 4}) == 2560
    assert gateway._calculate_max_output_tokens({"complexity_score": 7}) == 2560

    # 4. High complexity (>= 8)
    assert gateway._calculate_max_output_tokens({"complexity_score": 8}) == 4096
    assert gateway._calculate_max_output_tokens({"complexity_score": 10}) == 4096

    # 5. Environment variable override
    monkeypatch.setenv("MAX_OUTPUT_TOKENS", "3000")
    assert gateway._calculate_max_output_tokens({"complexity_score": 1}) == 3000

    # 6. Instance parameter override
    gateway_custom = make_gateway(max_output_tokens=1024)
    assert gateway_custom._calculate_max_output_tokens({"complexity_score": 10}) == 1024


@pytest.mark.asyncio
async def test_streaming_request_passes_dynamic_max_output_tokens(monkeypatch):
    """Ensure generationConfig in streaming request sends tuned maxOutputTokens (#CC-020)."""
    gateway = make_gateway()
    payload = {"reading": "Tuned", "sections": [], "challenge": "", "closing": ""}
    response = FakeResponse([model_event(json.dumps(payload))])
    captured = {}
    patch_session(monkeypatch, response, captured)

    await collect(gateway, mentor_id="ada_lovelace", code_analysis={"complexity_score": 2})

    sent_payload = captured.get("kwargs", {}).get("json", {})
    gen_config = sent_payload.get("generationConfig", {})
    assert gen_config.get("maxOutputTokens") == 1536


def test_resolve_mentors_dir_priority(tmp_path, monkeypatch):
    """Ensure resolve_mentors_dir checks custom dir, MENTORS_DIR env, and fallback (#CC-022)."""
    # 1. Default fallback resolves and exists
    default_dir = ai_service.resolve_mentors_dir()
    assert default_dir.is_dir()
    assert (default_dir / "ada_lovelace.json").exists()

    # 2. MENTORS_DIR env var pointing to valid directory
    monkeypatch.setenv("MENTORS_DIR", str(tmp_path))
    assert ai_service.resolve_mentors_dir() == tmp_path.resolve()

    # 3. MENTORS_DIR env var pointing to non-existent directory safely falls back
    monkeypatch.setenv("MENTORS_DIR", str(tmp_path / "does_not_exist"))
    assert ai_service.resolve_mentors_dir() == default_dir

    # 4. Explicit custom directory argument takes precedence
    custom_dir = tmp_path / "custom"
    custom_dir.mkdir()
    assert ai_service.resolve_mentors_dir(custom_dir) == custom_dir.resolve()


def test_gateway_loads_from_custom_mentors_dir(tmp_path):
    """Verify AIGateway loads persona configurations from injected mentors_dir (#CC-022)."""
    custom_mentor = {
        "mentor_id": "hypatia",
        "name": "Hypatia of Alexandria",
        "era": "c. 360 - 415 AD",
        "icon": "📜",
        "accent_color": "#d4af37",
        "avatar_url": "/mentors/hypatia.jpg",
        "tone": "Philosophical",
        "focus_areas": ["geometry", "philosophy"],
        "system_prompt": "You are Hypatia.",
        "feedback_schema": {"sections": [{"id": "geometry", "label": "Geometry"}]},
        "few_shot_examples": [],
        "signature_opening": "Greetings from the Library.",
        "signature_closing": "Wisdom endure."
    }
    (tmp_path / "hypatia.json").write_text(json.dumps(custom_mentor), encoding="utf-8")

    gateway = AIGateway(api_key="test-key", mentors_dir=tmp_path)
    assert "hypatia" in gateway.mentors
    assert gateway.mentors["hypatia"].name == "Hypatia of Alexandria"
    assert gateway.mentors["hypatia"].icon == "📜"





