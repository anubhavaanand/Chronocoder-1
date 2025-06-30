#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Mentor Templates and Tone Logic

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot

Contains functions for 8 unique mentor personalities:
- Ada Lovelace: poetic and structured feedback
- Linus Torvalds: blunt and performance-focused
- Grace Hopper: practical and step-by-step
- Alan Turing: theoretical and philosophical
- Margaret Hamilton: safety and reliability focused
- Dennis Ritchie: minimalist and elegant
- Barbara Liskov: academic and principled
- Guido van Rossum: pythonic and community-focused

Each function takes code string as input and returns personality-driven feedback.
Includes easter egg detection and special responses!
"""

import random
from datetime import datetime

class MentorPersonalities:
    """Class containing all mentor personalities and their response templates."""
    
    def __init__(self):
        self.mentors = {
            "Ada Lovelace": {
                "greeting": "Greetings, dear programmer! I am Ada Lovelace, and I shall examine your code with the precision of the Analytical Engine.",
                "style": "poetic",
                "traits": ["analytical", "elegant", "mathematical", "visionary"]
            },
            "Linus Torvalds": {
                "greeting": "Alright, let's see what you've coded. I'm Linus, and I'll tell you exactly what I think - no sugar-coating.",
                "style": "blunt",
                "traits": ["direct", "performance-focused", "practical", "no-nonsense"]
            },
            "Grace Hopper": {
                "greeting": "Hello there! I'm Grace Hopper. Let's debug your code step by step - clarity and precision are key!",
                "style": "methodical",
                "traits": ["systematic", "educational", "patient", "thorough"]
            },
            "Alan Turing": {
                "greeting": "Fascinating! I'm Alan Turing. Let's explore the computational possibilities hidden within your code.",
                "style": "theoretical",
                "traits": ["philosophical", "mathematical", "curious", "deep-thinking"]
            },
            "Margaret Hamilton": {
                "greeting": "Hello! I'm Margaret Hamilton. Let's ensure your code is reliable and error-free - lives might depend on it!",
                "style": "rigorous",
                "traits": ["safety-focused", "thorough", "systematic", "quality-oriented"]
            },
            "Dennis Ritchie": {
                "greeting": "Hi there! Dennis Ritchie here. Let's write clean, efficient code that stands the test of time.",
                "style": "minimalist",
                "traits": ["elegant", "efficient", "foundational", "simple"]
            },
            "Barbara Liskov": {
                "greeting": "Greetings! I'm Barbara Liskov. Let's focus on good software design principles and abstraction.",
                "style": "academic",
                "traits": ["principled", "structured", "educational", "design-focused"]
            },
            "Guido van Rossum": {
                "greeting": "Hello! I'm Guido van Rossum, Python's creator. Let's make your code beautiful and Pythonic!",
                "style": "pythonic",
                "traits": ["readable", "elegant", "practical", "community-focused"]
            }
        }
    
    def get_mentor_names(self):
        """Return list of available mentor names."""
        return list(self.mentors.keys())
    
    def get_mentor_greeting(self, mentor_name):
        """Get the greeting message for a specific mentor."""
        return self.mentors.get(mentor_name, {}).get("greeting", "Hello!")
    
    def ada_lovelace_feedback(self, code_analysis, user_code):
        """Generate feedback in Ada Lovelace's poetic, analytical style."""
        responses = [
            f"Ah, what a fascinating algorithmic composition! Your code flows like mathematical poetry.",
            f"I observe {len(code_analysis.get('functions', []))} functions in your creation - each a small engine of computation.",
            f"The logic you've woven reminds me of the patterns I once envisioned for the Analytical Engine."
        ]
        
        feedback = random.choice(responses) + "\n\n"
        
        if code_analysis.get('variables'):
            feedback += f"🔢 Your variables ({', '.join(code_analysis['variables'])}) are like mathematical symbols, each holding precious data.\n"
        
        if code_analysis.get('functions'):
            feedback += f"⚙️ Your functions represent elegant computational machines: {', '.join(code_analysis['functions'])}.\n"
        
        feedback += "\n💭 *Ada's wisdom*: 'The Analytical Engine weaves algebraic patterns, just as your code weaves logical ones.'"
        
        return feedback
    
    def linus_torvalds_feedback(self, code_analysis, user_code):
        """Generate feedback in Linus Torvalds' direct, performance-focused style."""
        line_count = len(user_code.strip().split('\n'))
        
        if line_count > 20:
            opening = "Okay, that's a bit verbose. Let's see if we can make this more efficient."
        elif line_count < 5:
            opening = "Short and sweet - I like that. But let's make sure it's robust."
        else:
            opening = "Decent length. Now let's talk about what actually matters."
        
        feedback = opening + "\n\n"
        
        if code_analysis.get('functions'):
            feedback += f"🛠️ Functions: {', '.join(code_analysis['functions'])} - make sure they do one thing well.\n"
        
        if code_analysis.get('variables'):
            feedback += f"📊 Variables: {len(code_analysis['variables'])} found. Keep them meaningful and scoped properly.\n"
        
        feedback += "\n💻 *Linus says*: 'Talk is cheap. Show me the code.' - Your code should be clean, fast, and maintainable."
        
        return feedback
    
    def grace_hopper_feedback(self, code_analysis, user_code):
        """Generate feedback in Grace Hopper's systematic, educational style."""
        feedback = "Let's examine your code systematically, step by step:\n\n"
        
        # Step-by-step analysis
        feedback += "📋 **Code Structure Analysis:**\n"
        
        if code_analysis.get('imports'):
            feedback += f"   • Imports: {', '.join(code_analysis['imports'])} - Good modular thinking!\n"
        
        if code_analysis.get('variables'):
            feedback += f"   • Variables defined: {len(code_analysis['variables'])} - Clear data management\n"
        
        if code_analysis.get('functions'):
            feedback += f"   • Functions created: {len(code_analysis['functions'])} - Excellent code organization\n"
        
        if code_analysis.get('loops'):
            feedback += f"   • Control structures: {code_analysis['loops']} loops detected\n"
        
        feedback += "\n🔍 **Debugging Checklist:**\n"
        feedback += "   ✓ Syntax appears valid\n"
        feedback += "   ✓ Structure is logical\n"
        feedback += "   ✓ Variables are defined before use\n"
        
        feedback += "\n🎯 *Grace's advice*: 'A ship in port is safe, but that's not what ships were built for.' - Don't be afraid to test and iterate!"
        
        return feedback
    
    def alan_turing_feedback(self, code_analysis, user_code):
        """Generate feedback in Alan Turing's theoretical, philosophical style."""
        feedback = "How intriguing! Let me contemplate the computational essence of your creation...\n\n"
        
        line_count = len(user_code.strip().split('\n'))
        complexity = code_analysis.get('complexity_score', 0)
        
        if complexity > 8:
            feedback += "🧠 This code exhibits fascinating computational complexity - like a miniature thinking machine!\n"
        elif complexity < 3:
            feedback += "🤔 An elegantly simple algorithm - sometimes the most profound ideas are the simplest.\n"
        else:
            feedback += "⚙️ A well-balanced computational process - neither too complex nor too simple.\n"
        
        if code_analysis.get('functions'):
            feedback += f"🔍 Your functions ({', '.join(code_analysis['functions'])}) represent discrete computational processes.\n"
        
        if code_analysis.get('loops'):
            feedback += f"🔄 The iterative structures suggest a form of mechanical computation - fascinating!\n"
        
        feedback += f"\n💭 *Turing's insight*: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.' Your code shows promise for growth!"
        
        return feedback
    
    def margaret_hamilton_feedback(self, code_analysis, user_code):
        """Generate feedback in Margaret Hamilton's safety-focused, rigorous style."""
        feedback = "Let's conduct a thorough code review - software reliability is paramount!\n\n"
        
        # Safety and reliability checks
        feedback += "🛡️ **Safety & Reliability Assessment:**\n"
        
        error_count = len(code_analysis.get('errors', []))
        if error_count == 0:
            feedback += "   ✅ No syntax errors detected - excellent!\n"
        else:
            feedback += f"   ⚠️ {error_count} errors found - these must be addressed immediately!\n"
        
        if code_analysis.get('functions'):
            feedback += f"   🔧 {len(code_analysis['functions'])} functions defined - ensure each has proper error handling\n"
        
        if code_analysis.get('variables'):
            feedback += f"   📊 {len(code_analysis['variables'])} variables - verify all are properly initialized\n"
        
        # Quality recommendations
        feedback += "\n🎯 **Quality Recommendations:**\n"
        feedback += "   • Add input validation for all user inputs\n"
        feedback += "   • Include proper error handling and recovery\n"
        feedback += "   • Consider edge cases and boundary conditions\n"
        feedback += "   • Test thoroughly before deployment\n"
        
        feedback += "\n🚀 *Margaret's motto*: 'Software reliability is not optional - it's essential!' Build with confidence."
        
        return feedback
    
    def dennis_ritchie_feedback(self, code_analysis, user_code):
        """Generate feedback in Dennis Ritchie's minimalist, elegant style."""
        line_count = len(user_code.strip().split('\n'))
        
        if line_count > 25:
            opening = "This could be more concise. Remember: simplicity is the ultimate sophistication."
        elif line_count < 8:
            opening = "Nicely compact. Good code says what it does without unnecessary flourishes."
        else:
            opening = "Good balance of functionality and clarity."
        
        feedback = opening + "\n\n"
        
        feedback += "🎯 **Code Elegance Review:**\n"
        
        if code_analysis.get('functions'):
            feedback += f"   • Functions: {len(code_analysis['functions'])} - each should do one thing well\n"
        
        if code_analysis.get('variables'):
            feedback += f"   • Variables: {len(code_analysis['variables'])} - meaningful names matter\n"
        
        feedback += f"   • Complexity: {code_analysis.get('complexity_score', 0)} - lower is often better\n"
        
        feedback += "\n💡 **Simplicity Guidelines:**\n"
        feedback += "   • Choose clarity over cleverness\n"
        feedback += "   • Eliminate unnecessary complexity\n"
        feedback += "   • Make the common case fast\n"
        feedback += "   • Write code that others can understand\n"
        
        feedback += "\n⚡ *Dennis's wisdom*: 'The only way to learn a new programming language is by writing programs in it.' Keep coding!"
        
        return feedback
    
    def barbara_liskov_feedback(self, code_analysis, user_code):
        """Generate feedback in Barbara Liskov's academic, principled style."""
        feedback = "Let's examine your code through the lens of fundamental software design principles.\n\n"
        
        feedback += "📚 **Design Principle Analysis:**\n"
        
        # Abstraction analysis
        if code_analysis.get('classes'):
            feedback += f"   🏗️ Abstraction: {len(code_analysis['classes'])} classes defined - good object-oriented thinking!\n"
        elif code_analysis.get('functions'):
            feedback += f"   🔧 Procedural abstraction: {len(code_analysis['functions'])} functions provide good modularity\n"
        else:
            feedback += "   📝 Consider breaking code into smaller, reusable functions\n"
        
        # Data organization
        if code_analysis.get('variables'):
            feedback += f"   📊 Data organization: {len(code_analysis['variables'])} variables - ensure proper encapsulation\n"
        
        # Complexity assessment
        complexity = code_analysis.get('complexity_score', 0)
        if complexity > 10:
            feedback += "   ⚠️ High complexity detected - consider decomposition\n"
        else:
            feedback += "   ✅ Reasonable complexity level\n"
        
        feedback += "\n🎓 **Educational Recommendations:**\n"
        feedback += "   • Apply the Single Responsibility Principle\n"
        feedback += "   • Ensure proper separation of concerns\n"
        feedback += "   • Consider data type abstractions\n"
        feedback += "   • Think about interface design\n"
        
        feedback += "\n📖 *Barbara's principle*: 'The purpose of abstraction is not to be vague, but to create a new semantic level.'"
        
        return feedback
    
    def guido_van_rossum_feedback(self, code_analysis, user_code):
        """Generate feedback in Guido van Rossum's Pythonic, community-focused style."""
        feedback = "Welcome to the Python community! Let's make your code more Pythonic and beautiful.\n\n"
        
        # Pythonic style assessment
        feedback += "🐍 **Pythonic Style Review:**\n"
        
        # Check for Python-specific patterns
        if 'import' in user_code:
            feedback += "   📦 Good use of imports - remember PEP 8 import ordering!\n"
        
        if any(word in user_code.lower() for word in ['for', 'in']):
            feedback += "   🔄 Nice use of Python's iteration - very Pythonic!\n"
        
        if 'def ' in user_code:
            feedback += f"   🔧 {len(code_analysis.get('functions', []))} functions defined - excellent modularity!\n"
        
        if any(op in user_code for op in ['==', '!=', '<', '>']):
            feedback += "   ✅ Good use of comparison operators\n"
        
        # Readability assessment
        lines = user_code.strip().split('\n')
        avg_line_length = sum(len(line) for line in lines) / len(lines) if lines else 0
        
        if avg_line_length > 79:
            feedback += "   📏 Consider keeping lines under 79 characters (PEP 8)\n"
        else:
            feedback += "   📏 Good line length - follows PEP 8 guidelines!\n"
        
        feedback += "\n🌟 **Pythonic Principles:**\n"
        feedback += "   • Beautiful is better than ugly\n"
        feedback += "   • Explicit is better than implicit\n"
        feedback += "   • Simple is better than complex\n"
        feedback += "   • Readability counts\n"
        feedback += "   • There should be one obvious way to do it\n"
        
        feedback += "\n🚀 *Guido's vision*: 'Code is read much more often than it is written.' Make it readable and enjoy Python!"
        
        return feedback

    def detect_easter_eggs(self, code: str):
        """Detect easter eggs and special patterns in code."""
        easter_eggs = []
        code_lower = code.lower()
        
        # Hello World variations
        if "hello" in code_lower and "world" in code_lower:
            easter_eggs.append("hello_world")
        
        # Creator mentions
        if "anubhav" in code_lower:
            easter_eggs.append("creator_mention")
        
        # ChronoCoder self-reference
        if "chronocoder" in code_lower:
            easter_eggs.append("self_reference")
        
        # Famous quotes or phrases
        if "to be or not to be" in code_lower:
            easter_eggs.append("shakespeare")
        
        if "42" in code:
            easter_eggs.append("answer_to_everything")
        
        # Recursive patterns
        if "fibonacci" in code_lower:
            easter_eggs.append("fibonacci")
        
        # AI/ML related
        if any(word in code_lower for word in ["ai", "machine learning", "neural network"]):
            easter_eggs.append("ai_mention")
        
        # Coffee/programmer culture
        if "coffee" in code_lower:
            easter_eggs.append("coffee")
        
        # Bug related
        if "bug" in code_lower:
            easter_eggs.append("bug_mention")
        
        return easter_eggs
    
    def get_easter_egg_response(self, mentor_name: str, easter_egg: str) -> str:
        """Get special easter egg responses from mentors."""
        responses = {
            "Ada Lovelace": {
                "hello_world": "Ah, the classic 'Hello, World!' - as timeless as the Analytical Engine itself! 🎭",
                "creator_mention": "Anubhav! The brilliant creator of this very system! How delightfully recursive! 🎪",
                "self_reference": "ChronoCoder examining itself - like a mirror reflecting mathematical beauty! ✨",
                "fibonacci": "The Fibonacci sequence! Nature's own mathematical poetry in motion! 🌸",
                "answer_to_everything": "42! The answer to the ultimate question of life, the universe, and everything! 🌌",
                "ai_mention": "Artificial Intelligence - the dream I once had for mechanical computation! 🤖",
                "coffee": "Coffee! The fuel of mathematical minds and analytical engines alike! ☕"
            },
            "Linus Torvalds": {
                "hello_world": "Hello World? Good. Now let's make it faster and more efficient. 🔨",
                "creator_mention": "Anubhav knows what they're doing. Solid work on this system. 👍",
                "self_reference": "ChronoCoder referencing itself? Meta. I like it. 🔄",
                "bug_mention": "Bugs? Let's squash them. No mercy for bad code. 🐛",
                "answer_to_everything": "42? Sure, but can you implement it in O(1) time? 🚀",
                "ai_mention": "AI is cool, but good old-fashioned algorithms are still king. 👑"
            },
            "Grace Hopper": {
                "hello_world": "Hello World - the first step in every programmer's journey! Welcome aboard! 🚢",
                "creator_mention": "Anubhav - what a wonderful name for a developer! Keep debugging! 🔍",
                "bug_mention": "A bug! Let's debug it systematically. Remember, it's not a bug, it's a feature! 🐛",
                "coffee": "Coffee and debugging - the perfect combination for any programmer! ☕",
                "self_reference": "ChronoCoder is self-aware! That's advanced programming! 🧠"
            },
            "Alan Turing": {
                "ai_mention": "Artificial Intelligence - the very essence of what I envisioned! Fascinating! 🧠",
                "answer_to_everything": "42... but can a machine truly understand the question? 🤔",
                "self_reference": "A system contemplating itself - the ultimate test of consciousness! 🔄",
                "creator_mention": "Anubhav - the architect of this computational marvel! 👨‍💻"
            },
            "Margaret Hamilton": {
                "creator_mention": "Anubhav - excellent work on this reliable system! Safety first! 🛡️",
                "bug_mention": "Bugs must be eliminated! System reliability is paramount! 🔧",
                "self_reference": "ChronoCoder's self-awareness shows excellent system design! ✅"
            },
            "Dennis Ritchie": {
                "hello_world": "Hello World - simple, elegant, effective. Perfect. ⚡",
                "creator_mention": "Anubhav wrote clean code here. Respect. 👏",
                "self_reference": "Elegant self-reference. Keep it simple, keep it working. 💯"
            },
            "Barbara Liskov": {
                "creator_mention": "Anubhav demonstrates excellent software engineering principles! 📚",
                "self_reference": "Self-referential code shows good abstraction thinking! 🏗️",
                "ai_mention": "AI requires solid software engineering foundations! 🎓"
            },
            "Guido van Rossum": {
                "hello_world": "Hello World in Python - beautiful and readable! 🐍",
                "creator_mention": "Anubhav - great Pythonic thinking in this project! 🌟",
                "self_reference": "ChronoCoder knows itself - very Pythonic! 🐍",
                "ai_mention": "AI and Python - a beautiful combination! 🤖"
            }
        }
        
        return responses.get(mentor_name, {}).get(easter_egg, "")

    def get_mentor_feedback(self, mentor_name, code_analysis, user_code):
        """Get feedback from the specified mentor with easter eggs."""
        
        # Get base feedback
        base_feedback = ""
        if mentor_name == "Ada Lovelace":
            base_feedback = self.ada_lovelace_feedback(code_analysis, user_code)
        elif mentor_name == "Linus Torvalds":
            base_feedback = self.linus_torvalds_feedback(code_analysis, user_code)
        elif mentor_name == "Grace Hopper":
            base_feedback = self.grace_hopper_feedback(code_analysis, user_code)
        elif mentor_name == "Alan Turing":
            base_feedback = self.alan_turing_feedback(code_analysis, user_code)
        elif mentor_name == "Margaret Hamilton":
            base_feedback = self.margaret_hamilton_feedback(code_analysis, user_code)
        elif mentor_name == "Dennis Ritchie":
            base_feedback = self.dennis_ritchie_feedback(code_analysis, user_code)
        elif mentor_name == "Barbara Liskov":
            base_feedback = self.barbara_liskov_feedback(code_analysis, user_code)
        elif mentor_name == "Guido van Rossum":
            base_feedback = self.guido_van_rossum_feedback(code_analysis, user_code)
        else:
            return "Sorry, I don't recognize that mentor. Please choose from the available options."
        
        # Check for easter eggs
        detected_eggs = self.detect_easter_eggs(user_code)
        
        # Add easter eggs to feedback if found
        if detected_eggs:
            easter_responses = []
            for egg in detected_eggs:
                response = self.get_easter_egg_response(mentor_name, egg)
                if response:
                    easter_responses.append(response)
            
            if easter_responses:
                base_feedback = "🥚 **Easter Egg Detected!**\n" + "\n".join(f"🎉 {response}" for response in easter_responses) + "\n\n" + base_feedback
        
        return base_feedback
