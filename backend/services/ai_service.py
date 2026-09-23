"""
AI Service - Gemini API Integration with Streaming Support
"""

import aiohttp
from typing import AsyncGenerator, Optional
import json


class AIGateway:
    """Unified interface to Google Gemini API with streaming support"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        
        # Mentor configurations (simplified - load from mentors.py in production)
        self.mentors = {
            "ada_lovelace": self._ada_prompt(),
            "linus_torvalds": self._linus_prompt(),
            "grace_hopper": self._grace_prompt(),
            "alan_turing": self._alan_prompt()
        }
    
    def _ada_prompt(self) -> dict:
        return {
            "role_prompt": "You are Ada Lovelace writing in 1843 London.",
            "tone": "Poetic and mathematical",
            "focus": ["mathematical elegance", "algorithmic thinking", "historical accuracy"]
        }
    
    def _linus_prompt(self) -> dict:
        return {
            "role_prompt": "You are Linus Torvalds being direct about code quality.",
            "tone": "Direct and blunt",
            "focus": ["performance", "simplicity", "practicality"]
        }
    
    def _grace_prompt(self) -> dict:
        return {
            "role_prompt": "You are Grace Hopper teaching systematically.",
            "tone": "Educational and encouraging",
            "focus": ["clarity", "debugging", "best practices"]
        }
    
    def _alan_prompt(self) -> dict:
        return {
            "role_prompt": "You are Alan Turing exploring computational theory.",
            "tone": "Philosophical and precise",
            "focus": ["theoretical foundations", "logical reasoning", "computability"]
        }
    
    async def get_feedback_streaming(
        self,
        mentor_id: str,
        user_code: str,
        code_analysis: dict
    ) -> AsyncGenerator[str, None]:
        """Stream tokens to client in real-time"""
        
        if mentor_id not in self.mentors:
            raise ValueError(f"Unknown mentor: {mentor_id}")
        
        mentor_config = self.mentors[mentor_id]
        
        # Build context-rich prompt
        prompt = f"""{mentor_config['role_prompt']}

Here's Python code that needs review:

```python
{user_code}
```

STATIC ANALYSIS:
{json.dumps(code_analysis, indent=2)}

Provide personalized feedback focusing on: {' '.join(mentor_config['focus'])}

Use a {mentor_config['tone']} approach."""
        
        # Call Gemini API with streaming
        url = f"{self.base_url}/gemini-2.0-flash:streamGenerateContent?key={self.api_key}"
        
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
                "topP": 0.95
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Gemini API error: {error_text}")
                
                # Parse streaming chunks
                async for chunk in response.content:
                    if chunk:
                        try:
                            data = json.loads(chunk.decode('utf-8'))
                            
                            # Extract text from Gemini's response format
                            if 'candidates' in data and len(data['candidates']) > 0:
                                content = data['candidates'][0].get('content', {})
                                parts = content.get('parts', [])
                                
                                for part in parts:
                                    text = part.get('text', '')
                                    if text:
                                        yield text
                        
                        except json.JSONDecodeError:
                            continue  # Skip malformed chunks
    
    def build_mentor_prompt(self, mentor_id: str, user_code: str) -> str:
        """Build complete prompt for non-streaming mode"""
        mentor = self.mentors.get(mentor_id, self.mentors["ada_lovelace"])
        return f"""{mentor['role_prompt']}

Review this Python code:

```python
{user_code}
```

Provide comprehensive feedback using your natural teaching style."""
