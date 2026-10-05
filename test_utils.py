import pytest
from utils import DeveloperMessages

def test_get_random_error_message():
    """Test get_random_error_message returns a valid string from the expected set."""
    # Since we can't easily access the inner messages list without reflection or duplication,
    # we can verify that it returns a non-empty string and that multiple calls work.

    # Act & Assert
    message = DeveloperMessages.get_random_error_message()

    assert isinstance(message, str)
    assert len(message) > 0

    # Run a few more times to ensure it works consistently and doesn't crash
    messages_seen = set()
    for _ in range(20):
        msg = DeveloperMessages.get_random_error_message()
        assert isinstance(msg, str)
        assert len(msg) > 0
        messages_seen.add(msg)

    # Since it's random, we should see more than one unique message after 20 attempts
    assert len(messages_seen) > 1
