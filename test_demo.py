#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Demo script to test ChronoCoder components
Run this to test the individual modules before using the Streamlit app.
"""

from mentors import MentorPersonalities
from code_parser import CodeAnalyzer
from utils import SessionLogger, CodeFormatter

def test_chronocoder():
    """Test all ChronoCoder components."""
    
    print("ChronoCoder Component Test - 8 Mentor Personalities")
    print("=" * 60)
    
    # Test code to analyze
    sample_code = """
def fibonacci(n):
    '''Calculate fibonacci number recursively'''
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def fibonacci_optimized(n):
    '''Optimized fibonacci using memoization'''
    memo = {}
    def fib_helper(x):
        if x in memo:
            return memo[x]
        if x <= 1:
            memo[x] = x
        else:
            memo[x] = fib_helper(x-1) + fib_helper(x-2)
        return memo[x]
    return fib_helper(n)

# Calculate and compare fibonacci numbers
print("Regular vs Optimized Fibonacci:")
for i in range(6):
    regular = fibonacci(i)
    optimized = fibonacci_optimized(i)
    print(f"F({i}) = {regular} | Optimized = {optimized}")
    """
    
    # Initialize components
    mentors = MentorPersonalities()
    analyzer = CodeAnalyzer()
    logger = SessionLogger()
    
    print(f"\n📝 Sample Code (More Complex):")
    print("-" * 40)
    print(sample_code[:200] + "..." if len(sample_code) > 200 else sample_code)
    
    # Test code analysis
    print(f"\nCode Analysis:")
    print("-" * 40)
    analysis = analyzer.parse_code(sample_code)
    summary = analyzer.get_code_summary(analysis)
    print(summary)
    
    print(f"\nAll 8 Mentor Personalities:")
    print("=" * 60)
    
    # Test each mentor with distinctive separators
    mentor_numbers = {
        "Ada Lovelace": 1,
        "Linus Torvalds": 2, 
        "Grace Hopper": 3,
        "Alan Turing": 4,
        "Margaret Hamilton": 5,
        "Dennis Ritchie": 6,
        "Barbara Liskov": 7,
        "Guido van Rossum": 8
    }
    
    for i, mentor_name in enumerate(mentors.get_mentor_names(), 1):
        number = mentor_numbers.get(mentor_name, i)
        print(f"\n{number}. {mentor_name}")
        print("-" * 50)
        
        greeting = mentors.get_mentor_greeting(mentor_name)
        print(f"Greeting: {greeting[:80]}...")
        
        feedback = mentors.get_mentor_feedback(mentor_name, analysis, sample_code)
        # Show first few lines of feedback
        feedback_lines = feedback.split('\n')[:4]
        print(f"\nFeedback Preview:")
        for line in feedback_lines:
            print(f"  {line}")
        print(f"  ... (and more detailed feedback)")
        
        # Log the interaction
        logger.log_interaction(sample_code, mentor_name, feedback, analysis)
    
    print(f"\n" + "=" * 60)
    
    # Test session summary
    print(f"\n📊 Session Summary:")
    print("-" * 40)
    print(logger.get_session_summary())
    
    # Save session
    filepath = logger.save_session()
    print(f"\n💾 Session saved to: {filepath}")
    
    print(f"\nAll 8 mentor personalities tested successfully!")
    print(f"Ready to run: streamlit run main.py")
    print(f"Now featuring: {', '.join(mentors.get_mentor_names())}")

if __name__ == "__main__":
    test_chronocoder()
