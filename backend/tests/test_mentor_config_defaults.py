"""MentorConfig defaults (#253)."""

from backend.services.ai_service import MentorConfig


def test_mentor_config_only_requires_identity_fields():
    mentor = MentorConfig(
        mentor_id="test_mentor",
        name="Test Mentor",
        era="Test Era",
        icon="test",
        accent_color="#ffffff",
    )

    assert mentor.avatar_url is None
    assert mentor.system_prompt == ""
    assert mentor.tone == ""
    assert mentor.focus_areas == []
    assert mentor.feedback_schema == {}
    assert mentor.few_shot_examples == []
    assert mentor.signature_opening == ""
    assert mentor.signature_closing == ""