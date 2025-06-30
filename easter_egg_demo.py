"""
ChronoCoder Easter Egg Demo
Created by Anubh

This script demonstrates all the hidden easter eggs in ChronoCoder!
Run this to see the special responses and hidden features.
"""

from mentors import MentorPersonalities
from code_parser import CodeAnalyzer
from utils import DeveloperMessages

def easter_egg_demo():
    """Demonstrate all easter eggs in ChronoCoder."""
    
    print("🥚 ChronoCoder Easter Egg Hunt! 🥚")
    print("=" * 50)
    print("Created by Anubh - Let's find all the hidden gems!")
    print("=" * 50)
    
    mentors = MentorPersonalities()
    analyzer = CodeAnalyzer()
    
    # Easter egg test cases
    test_cases = [
        {
            "name": "Hello World Classic",
            "code": 'print("Hello, World!")',
            "description": "The most famous first program"
        },
        {
            "name": "Fibonacci Fun",
            "code": """
def fibonacci(n):
    if n <= 1: return n
    return fibonacci(n-1) + fibonacci(n-2)
print(fibonacci(5))
            """,
            "description": "Everyone's favorite recursive sequence"
        },
        {
            "name": "AI/ML Detection",
            "code": """
import tensorflow as tf
import sklearn
# Machine learning and AI code here
print("Building the future with AI!")
            """,
            "description": "Artificial Intelligence triggers"
        },
        {
            "name": "Creator Appreciation",
            "code": """
# Thanks to Anubh for creating ChronoCoder!
def appreciate_creator():
    return "ChronoCoder is awesome!"
print(appreciate_creator())
            """,
            "description": "Give credit where credit is due"
        },
        {
            "name": "Easter Egg Hunter",
            "code": """
# I'm looking for easter eggs and secrets!
def find_hidden_features():
    return "Easter egg hunting is fun!"
            """,
            "description": "Direct easter egg search"
        },
        {
            "name": "Mentor Cross-Reference",
            "code": """
# Ada Lovelace and Grace Hopper were amazing!
def honor_pioneers():
    return "Celebrating women in computing!"
            """,
            "description": "Mentioning other mentors"
        }
    ]
    
    # Test with different mentors
    selected_mentors = ["Ada Lovelace", "Linus Torvalds", "Grace Hopper", "Guido van Rossum"]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🎯 Test {i}: {test_case['name']}")
        print(f"📝 {test_case['description']}")
        print("-" * 40)
        
        # Analyze the code
        analysis = analyzer.parse_code(test_case['code'])
        
        # Test with one mentor
        mentor = selected_mentors[(i-1) % len(selected_mentors)]
        feedback = mentors.get_mentor_feedback(mentor, analysis, test_case['code'])
        
        # Show if easter eggs were triggered
        if "🥚 **Easter Egg Bonus:**" in feedback:
            print(f"🎉 EASTER EGG FOUND with {mentor}!")
            # Extract just the easter egg part
            egg_part = feedback.split("🥚 **Easter Egg Bonus:**")[1].strip()
            print(f"🥚 {egg_part.split()[0:10]}")  # First few words
        else:
            print(f"🔍 No easter eggs triggered with {mentor}")
        
        print()
    
    # Show some fun facts
    print("\n🌟 Fun Facts & Credits:")
    print("-" * 30)
    print("🎯 Created by: Anubh")
    print("🧠 Mentors: 8 legendary programmers")
    print("🥚 Easter Eggs: 6+ hidden features")
    print("🐍 Built with: Python + Streamlit")
    print("❤️ Made with: Love for learning")
    
    # Show easter egg hints
    print(f"\n💡 Random Hint: {DeveloperMessages.get_easter_egg_hint()}")
    print(f"🎮 Fun Message: {DeveloperMessages.get_random_error_message()}")
    
    # Credits
    print(DeveloperMessages.get_credits())
    
    print("\n🚀 Ready to hunt for easter eggs in the main app!")
    print("Run: streamlit run main.py")

if __name__ == "__main__":
    easter_egg_demo()
