"""
ChronoCoder - Mentor Showcase Demo
This script demonstrates the unique personality of each mentor.
"""

from mentors import MentorPersonalities
from code_parser import CodeAnalyzer

def mentor_showcase():
    """Showcase each mentor's unique personality with sample code."""
    
    # Sample code examples for different mentors
    code_samples = {
        "beginner": """
def add_two_numbers(a, b):
    return a + b

result = add_two_numbers(5, 3)
print(f"Result: {result}")
        """,
        
        "intermediate": """
class Calculator:
    def __init__(self):
        self.history = []
    
    def calculate(self, operation, a, b):
        if operation == 'add':
            result = a + b
        elif operation == 'multiply':
            result = a * b
        else:
            result = None
        
        self.history.append((operation, a, b, result))
        return result

calc = Calculator()
print(calc.calculate('add', 10, 5))
        """,
        
        "advanced": """
from functools import wraps
import time

def performance_timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"{func.__name__} took {end_time - start_time:.4f} seconds")
        return result
    return wrapper

@performance_timer
def fibonacci_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 2:
        memo[n] = 1
    else:
        memo[n] = fibonacci_memo(n-1, memo) + fibonacci_memo(n-2, memo)
    return memo[n]

result = fibonacci_memo(30)
print(f"Fibonacci(30) = {result}")
        """,
    }
    
    mentors = MentorPersonalities()
    analyzer = CodeAnalyzer()
    
    print("🕰️ ChronoCoder - Mentor Personality Showcase")
    print("=" * 60)
    
    # Show each mentor with different code complexity
    mentor_names = mentors.get_mentor_names()
    code_types = ["beginner", "intermediate", "advanced"]
    
    for i, mentor_name in enumerate(mentor_names):
        code_type = code_types[i % len(code_types)]
        sample_code = code_samples[code_type].strip()
        
        print(f"\n{'='*20} {mentor_name} {'='*20}")
        print(f"📝 Reviewing {code_type} level code...")
        print("-" * 50)
        
        # Analyze the code
        analysis = analyzer.parse_code(sample_code)
        
        # Get mentor's greeting
        greeting = mentors.get_mentor_greeting(mentor_name)
        print(f"💬 {greeting}")
        
        # Get mentor's feedback
        feedback = mentors.get_mentor_feedback(mentor_name, analysis, sample_code)
        
        # Show key highlights from feedback
        feedback_lines = feedback.split('\n')
        key_lines = []
        for line in feedback_lines:
            if any(emoji in line for emoji in ['🎯', '💡', '🚀', '💭', '⚡', '📚', '🐍', '🛡️']):
                key_lines.append(line.strip())
        
        print(f"\n🌟 Key feedback highlights:")
        for line in key_lines[:3]:  # Show top 3 highlights
            if line:
                print(f"   {line}")
        
        print(f"\n📊 Code analysis: {analyzer.get_code_summary(analysis)}")
    
    print(f"\n{'='*60}")
    print("🎓 Each mentor brings their unique expertise to help you learn!")
    print("🚀 Try them all in the Streamlit app: http://localhost:8501")

if __name__ == "__main__":
    mentor_showcase()
