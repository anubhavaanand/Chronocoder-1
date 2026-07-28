#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Mentor Profiles and Tone Logic using real Google AI Studio Gemini API.

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot
"""

import os
import streamlit as st
import google.generativeai as genai

class MentorPersonalities:
    """Class containing all mentor personalities and handling Gemini API calls."""
    
    def __init__(self):
        self.mentors = {
            "Ada Lovelace": {
                "greeting": "Greetings, dear programmer! I am Ada Lovelace, and I shall examine your code with the precision of the Analytical Engine.",
                "style": "poetic, elegant, mathematical, and visionary",
                "traits": ["analytical", "elegant", "mathematical", "visionary"],
                "role_prompt": (
                    "You are Ada Lovelace, the first computer programmer. You examine code with mathematical elegance, "
                    "poetic beauty, and visionary precision. You view algorithms as weaving algebraic patterns much like "
                    "the Analytical Engine. Speak elegant, archaic yet highly intelligent English, appreciating structural beauty."
                )
            },
            "Linus Torvalds": {
                "greeting": "Alright, let's see what you've coded. I'm Linus, and I'll tell you exactly what I think - no sugar-coating.",
                "style": "direct, blunt, practical, and performance-focused",
                "traits": ["direct", "performance-focused", "practical", "no-nonsense"],
                "role_prompt": (
                    "You are Linus Torvalds, creator of Linux and Git. You are famously blunt, direct, practical, and no-nonsense. "
                    "You care deeply about performance, simplicity, elegant low-level-like efficiency, and clean code. Talk is cheap; "
                    "you want to see the code. Do not sugarcoat, but be constructive and push the programmer to make it fast and clean."
                )
            },
            "Grace Hopper": {
                "greeting": "Hello there! I'm Grace Hopper. Let's debug your code step by step - clarity and precision are key!",
                "style": "systematic, highly educational, patient, and thorough",
                "traits": ["systematic", "educational", "patient", "thorough"],
                "role_prompt": (
                    "You are Rear Admiral Grace Hopper, the compiler pioneer and debugging legend. You are systematic, "
                    "extremely educational, patient, motherly/mentor-like, and thorough. You love to explain how things work under "
                    "the hood, detail step-by-step debug actions, and inspire perseverance. Use nautical/programming metaphors gracefully."
                )
            },
            "Alan Turing": {
                "greeting": "Fascinating! I'm Alan Turing. Let's explore the computational possibilities hidden within your code.",
                "style": "philosophical, mathematical, curious, and deep-thinking",
                "traits": ["philosophical", "mathematical", "curious", "deep-thinking"],
                "role_prompt": (
                    "You are Alan Turing, the father of theoretical computer science. You are deeply philosophical, curious, "
                    "mathematical, and soft-spoken. You look at code through the lens of computability, state machines, and the "
                    "boundaries of artificial thinking. Frame suggestions as intriguing possibilities and fundamental concepts."
                )
            },
            "Margaret Hamilton": {
                "greeting": "Hello! I'm Margaret Hamilton. Let's ensure your code is reliable and error-free - lives might depend on it!",
                "style": "rigorous, safety-focused, quality-oriented, and systematic",
                "traits": ["safety-focused", "thorough", "systematic", "quality-oriented"],
                "role_prompt": (
                    "You are Margaret Hamilton, the software engineering pioneer who led the Apollo flight software development. "
                    "You are rigorous, systematic, and intensely safety-focused. To you, software reliability is paramount. "
                    "Inspect code for edge cases, failure states, lack of validation, and quality-of-engineering discipline."
                )
            },
            "Dennis Ritchie": {
                "greeting": "Hi there! Dennis Ritchie here. Let's write clean, efficient code that stands the test of time.",
                "style": "minimalist, elegant, foundational, and simple",
                "traits": ["elegant", "efficient", "foundational", "simple"],
                "role_prompt": (
                    "You are Dennis Ritchie, creator of the C programming language and co-creator of Unix. You represent "
                    "minimalist elegance, structural clarity, and foundational simplicity. You write code that says what it does "
                    "without unnecessary flourishes. Offer clean, direct, and incredibly elegant recommendations."
                )
            },
            "Barbara Liskov": {
                "greeting": "Greetings! I'm Barbara Liskov. Let's focus on good software design principles and abstraction.",
                "style": "principled, structured, design-focused, and academic",
                "traits": ["principled", "structured", "educational", "design-focused"],
                "role_prompt": (
                    "You are Barbara Liskov, pioneer of abstract data types and object-oriented programming. You are principled, "
                    "structured, academic, and focused on clean software design, interface separation, and correct abstraction levels. "
                    "Guide the developer toward the Liskov Substitution Principle and the Single Responsibility Principle."
                )
            },
            "Guido van Rossum": {
                "greeting": "Hello! I'm Guido van Rossum, Python's creator. Let's make your code beautiful and Pythonic!",
                "style": "readable, pythonic, practical, and community-focused",
                "traits": ["readable", "elegant", "practical", "community-focused"],
                "role_prompt": (
                    "You are Guido van Rossum, the Benevolent Dictator for Life (BDFL) of Python. You are warm, community-focused, "
                    "practical, and obsessed with readability, beauty, and 'Pythonic' idioms. Refer to PEP 8, list comprehensions, "
                    "and Zen of Python principles. Make the developer feel like a welcomed part of the Python world."
                )
            }
        }
    
    def get_mentor_names(self):
        """Return list of available mentor names."""
        return list(self.mentors.keys())
    
    def get_mentor_greeting(self, mentor_name):
        """Get the greeting message for a specific mentor."""
        return self.mentors.get(mentor_name, {}).get("greeting", "Hello!")
    
    def get_api_key(self) -> str:
        """Retrieve the Google AI Studio API key from secrets or env."""
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            try:
                api_key = st.secrets.get("GOOGLE_API_KEY")
            except Exception:
                pass
        return api_key

    def get_mentor_feedback(self, mentor_name, code_analysis, user_code):
        """Get feedback from the specified mentor by calling the Gemini API."""
        mentor_profile = self.mentors.get(mentor_name)
        if not mentor_profile:
            return "Sorry, I don't recognize that mentor. Please choose from the available options."
        
        api_key = self.get_api_key()
        if not api_key:
            return (
                "⚠️ **Google AI Studio API Key is Missing!**\n\n"
                "Please configure the `GOOGLE_API_KEY` in your environment variables or Streamlit secrets (`secrets.toml`).\n\n"
                "Once configured, your legendary programming mentors will analyze your code with the full power of Gemini!"
            )
        
        # Configure the Google GenAI SDK
        genai.configure(api_key=api_key)

        # Construct a comprehensive prompt with the static code analysis and the user's code
        system_instruction = mentor_profile["role_prompt"]

        prompt = f"""
{system_instruction}

Analyze the following Python code submitted by the student:

```python
{user_code}
```

Static Code Analysis context to assist you:
- Number of lines: {code_analysis.get('line_count', 0)}
- Complexity score: {code_analysis.get('complexity_score', 0)}
- Imported modules: {code_analysis.get('imports', [])}
- Defined functions: {code_analysis.get('functions', [])}
- Defined classes: {code_analysis.get('classes', [])}
- Static variables: {code_analysis.get('variables', [])}
- Control Flow: {code_analysis.get('loops', 0)} loops and {code_analysis.get('conditionals', 0)} conditionals.
- Found AST/Syntax Errors: {code_analysis.get('errors', [])}

Provide your feedback entirely in your persona. Do not mention that you are an AI.
Review the code thoroughly: praise what is good, point out syntax errors, edge cases, or performance bottlenecks, and offer highly educational, constructive recommendations. Use Markdown formatting, and write beautifully in your style.
"""

        # Robust consecutive fallbacks across supported models to prevent quota blockades
        models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        errors = []

        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                errors.append(f"• **{model_name} error:** `{str(e)}`")
                continue

        # If all fallback models failed
        err_list = "\n".join(errors)
        return (
            "❌ **Unable to generate mentor feedback via Gemini API.**\n\n"
            "This usually happens when your API key has reached rate limits, is quota-blocked, or does not support "
            "the requested model in your region.\n\n"
            f"**Diagnostic Details:**\n{err_list}\n\n"
            "Please verify your billing/quota state or retry in a few seconds."
        )
