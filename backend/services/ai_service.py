"""
AI Service - Gemini API Integration with Streaming Support
Loads mentor personas from JSON registry; enforces structured feedback schema.
"""

import aiohttp
import json
from pathlib import Path
from typing import AsyncGenerator, Optional
from pydantic import BaseModel
from typing import List


MENTORS_DIR = Path(__file__).parent.parent / "mentors"


class FeedbackSection(BaseModel):
    id: str
    label: str
    icon: str
    content: str


class MentorFeedback(BaseModel):
    mentor_id: str
    reading: str
    sections: List[FeedbackSection]
    challenge: str
    closing: str


class MentorConfig(BaseModel):
    mentor_id: str
    name: str
    era: str
    icon: str
    accent_color: str
    system_prompt: str
    tone: str
    focus_areas: List[str]
    feedback_schema: dict
    few_shot_examples: List[dict]
    signature_opening: str
    signature_closing: str


class AIGateway:
    """Unified interface to Google Gemini API with streaming + structured output."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        self.mentors: dict[str, MentorConfig] = self._load_mentor_registry()

    @staticmethod
    def _extract_sse_text(event: str) -> str:
        """Extract concatenated text parts from a single SSE event payload.

        Gemini streams ``data: {json}`` lines where each JSON object holds
        ``candidates[].content.parts[].text`` fragments of the model output.
        Comment lines (``:``) and the ``[DONE]`` sentinel are ignored.
        """
        data_lines = [
            line[len("data:"):].strip()
            for line in event.split("\n")
            if line.startswith("data:")
        ]
        if not data_lines:
            return ""
        raw = "\n".join(data_lines)
        if not raw or raw == "[DONE]":
            return ""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return ""
        parts = []
        for candidate in data.get("candidates", []):
            content = candidate.get("content", {})
            for part in content.get("parts", []):
                text = part.get("text", "")
                if text:
                    parts.append(text)
        return "".join(parts)

    def _load_mentor_registry(self) -> dict[str, MentorConfig]:
        """Load all mentor JSON files from backend/mentors/."""
        mentors = {}
        for path in MENTORS_DIR.glob("*.json"):
            with open(path, "r") as f:
                data = json.load(f)
            mentor_id = data["mentor_id"]
            mentors[mentor_id] = MentorConfig(**data)
        if not mentors:
            raise RuntimeError(f"No mentor configs found in {MENTORS_DIR}")
        return mentors

    def _build_prompt(self, mentor: MentorConfig, user_code: str, code_analysis: dict) -> str:
        """Build prompt with system prompt, few-shot examples, and schema hint."""
        examples_text = ""
        for ex in mentor.few_shot_examples:
            examples_text += f"\n\n--- EXAMPLE ---\nUser code:\n```python\n{ex['user_code']}\n```\nResponse:\n{ex['response']}\n"

        schema_hint = json.dumps({
            "type": "object",
            "properties": {
                "reading": {"type": "string"},
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "icon": {"type": "string"},
                            "content": {"type": "string"}
                        },
                        "required": ["id", "label", "icon", "content"]
                    }
                },
                "challenge": {"type": "string"},
                "closing": {"type": "string"}
            },
            "required": ["reading", "sections", "challenge", "closing"]
        }, indent=2)

        return f"""{mentor.system_prompt}

{mentor.signature_opening}

{examples_text}

--- TASK ---
User code to review:
```python
{user_code}
```

Static analysis:
{json.dumps(code_analysis, indent=2)}

Return ONLY valid JSON matching this schema:
{schema_hint}

Focus areas: {', '.join(mentor.focus_areas)}
Tone: {mentor.tone}

{mentor.signature_closing}"""

    async def get_feedback_streaming(
        self,
        mentor_id: str,
        user_code: str,
        code_analysis: dict
    ) -> AsyncGenerator[dict, None]:
        """Stream structured feedback tokens to client."""
        if mentor_id not in self.mentors:
            raise ValueError(f"Unknown mentor: {mentor_id}")

        mentor = self.mentors[mentor_id]
        prompt = self._build_prompt(mentor, user_code, code_analysis)

        # Gemini supports response_schema for structured output.
        # alt=sse returns one `data: {json}` event per token batch instead of
        # a raw JSON array, so arbitrary TCP chunk boundaries can never split
        # a JSON value (the old raw-chunk decoder silently dropped those).
        url = f"{self.base_url}/gemini-2.0-flash:streamGenerateContent?alt=sse&key={self.api_key}"

        headers = {"Content-Type": "application/json"}

        # Response schema for structured output
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "reading": {"type": "STRING"},
                "sections": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "id": {"type": "STRING"},
                            "label": {"type": "STRING"},
                            "icon": {"type": "STRING"},
                            "content": {"type": "STRING"}
                        },
                        "required": ["id", "label", "icon", "content"]
                    }
                },
                "challenge": {"type": "STRING"},
                "closing": {"type": "STRING"}
            },
            "required": ["reading", "sections", "challenge", "closing"]
        }

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.5,  # lower for structured output consistency
                "maxOutputTokens": 8192,
                "topP": 0.95,
                "responseMimeType": "application/json",
                "responseSchema": response_schema
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Gemini API error (HTTP {response.status}): {error_text}")

                # Buffer raw network bytes and split complete SSE events on
                # the blank-line delimiter — a JSON value is never parsed
                # from a partial TCP chunk.
                sse_buffer = ""
                text_buffer = ""
                async for chunk in response.content:
                    if not chunk:
                        continue
                    sse_buffer += chunk.decode("utf-8")
                    while "\n\n" in sse_buffer:
                        event, sse_buffer = sse_buffer.split("\n\n", 1)
                        text_buffer += self._extract_sse_text(event)
                        # Yield every complete JSON object the model has
                        # streamed so far.
                        while True:
                            try:
                                obj, idx = json.JSONDecoder().raw_decode(text_buffer)
                                yield {"type": "feedback_chunk", "payload": obj}
                                text_buffer = text_buffer[idx:].lstrip()
                            except json.JSONDecodeError:
                                break

                # Flush a trailing event that arrived without its blank line.
                if sse_buffer.strip():
                    text_buffer += self._extract_sse_text(sse_buffer)
                if text_buffer.strip():
                    try:
                        obj = json.loads(text_buffer)
                        yield {"type": "feedback_chunk", "payload": obj}
                    except json.JSONDecodeError:
                        pass

    def get_mentor_config(self, mentor_id: str) -> Optional[MentorConfig]:
        return self.mentors.get(mentor_id)

    def list_mentors(self) -> List[dict]:
        return [
            {
                "mentor_id": m.mentor_id,
                "name": m.name,
                "era": m.era,
                "icon": m.icon,
                "accent_color": m.accent_color,
                "signature_opening": m.signature_opening,
            }
            for m in self.mentors.values()
        ]