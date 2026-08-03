import pytest
from mentors import MentorPersonalities
from code_parser import CodeAnalyzer

def test_get_mentor_feedback_unknown_mentor():
    mentors = MentorPersonalities()
    analyzer = CodeAnalyzer()

    code = "print('hello')"
    analysis = analyzer.parse_code(code)

    feedback = mentors.get_mentor_feedback("Unknown Mentor", analysis, code)

    assert "Sorry, I don't recognize that mentor" in feedback
