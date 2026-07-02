import os
import json
import pytest
from datetime import datetime
from utils import SessionLogger, CodeFormatter, FileManager, DeveloperMessages

@pytest.fixture
def temp_log_dir(tmp_path):
    log_dir = tmp_path / "logs"
    return str(log_dir)

class TestCodeFormatter:
    def test_format_code_block_default(self):
        code = "print('hello')"
        expected = "```python\nprint('hello')\n```"
        assert CodeFormatter.format_code_block(code) == expected

    def test_format_code_block_custom_language(self):
        code = "console.log('hello')"
        expected = "```javascript\nconsole.log('hello')\n```"
        assert CodeFormatter.format_code_block(code, language="javascript") == expected

    def test_truncate_text_short(self):
        text = "short text"
        assert CodeFormatter.truncate_text(text, max_length=20) == "short text"

    def test_truncate_text_long(self):
        text = "this is a very long text that needs to be truncated"
        # Since length is 15, max_length-3 is 12. "this is a ve" is length 12
        expected = "this is a ve..."
        assert CodeFormatter.truncate_text(text, max_length=15) == expected

    def test_clean_code_input(self):
        code = "\n\n   print('hello')   \n\n"
        expected = "   print('hello')"
        assert CodeFormatter.clean_code_input(code) == expected

        code_multiline = "\n\n  def foo():  \n      pass   \n\n"
        expected_multiline = "  def foo():\n      pass"
        assert CodeFormatter.clean_code_input(code_multiline) == expected_multiline

class TestSessionLogger:
    def test_init_creates_directory(self, temp_log_dir):
        logger = SessionLogger(log_dir=temp_log_dir)
        assert os.path.exists(temp_log_dir)
        assert logger.current_session is not None
        assert "session_id" in logger.current_session
        assert logger.current_session["total_code_submissions"] == 0

    def test_log_interaction(self, temp_log_dir):
        logger = SessionLogger(log_dir=temp_log_dir)
        logger.log_interaction(
            user_code="print('hello')",
            mentor="Ada Lovelace",
            feedback="Good job!",
            analysis={"complexity_score": 1}
        )
        assert len(logger.current_session["interactions"]) == 1
        interaction = logger.current_session["interactions"][0]
        assert interaction["user_code"] == "print('hello')"
        assert interaction["mentor"] == "Ada Lovelace"
        assert interaction["feedback"] == "Good job!"
        assert interaction["complexity_score"] == 1
        assert logger.current_session["mentor_used"] == "Ada Lovelace"
        assert logger.current_session["total_code_submissions"] == 1

    def test_save_session(self, temp_log_dir):
        logger = SessionLogger(log_dir=temp_log_dir)
        logger.log_interaction("code", "mentor", "feedback", {})

        filepath = logger.save_session()
        assert os.path.exists(filepath)

        with open(filepath, 'r') as f:
            data = json.load(f)
            assert data["session_id"] == logger.current_session["session_id"]
            assert data["total_code_submissions"] == 1
            assert "end_time" in data

    def test_get_session_summary_empty(self, temp_log_dir):
        logger = SessionLogger(log_dir=temp_log_dir)
        assert logger.get_session_summary() == "No interactions in this session yet."

    def test_get_session_summary_with_interactions(self, temp_log_dir):
        logger = SessionLogger(log_dir=temp_log_dir)
        logger.log_interaction("code1", "Ada Lovelace", "feedback1", {"complexity_score": 2})
        logger.log_interaction("code2", "Ada Lovelace", "feedback2", {"complexity_score": 4})

        summary = logger.get_session_summary()
        assert "Total interactions: 2" in summary
        assert "Mentor: Ada Lovelace" in summary
        assert "Average code complexity: 3.0" in summary
        assert "Session duration" in summary

class TestFileManager:
    def test_export_session_to_markdown(self, tmp_path):
        output_path = tmp_path / "report.md"
        session_data = {
            "session_id": "test_123",
            "start_time": "2023-01-01T12:00:00",
            "mentor_used": "Ada Lovelace",
            "interactions": [
                {
                    "timestamp": "2023-01-01T12:01:00",
                    "user_code": "print('hello')",
                    "mentor": "Ada Lovelace",
                    "feedback": "Great code!"
                }
            ]
        }

        result = FileManager.export_session_to_markdown(session_data, str(output_path))
        assert result is True
        assert os.path.exists(output_path)

        with open(output_path, 'r') as f:
            content = f.read()
            assert "test_123" in content
            assert "Ada Lovelace" in content
            assert "Great code!" in content

    def test_export_session_to_markdown_error(self, tmp_path):
        output_path = tmp_path / "non_existent_dir" / "report.md"
        session_data = {
            "session_id": "test_123",
            "start_time": "2023-01-01T12:00:00",
            "mentor_used": "Ada Lovelace",
            "interactions": []
        }
        # It should return False when an exception occurs
        result = FileManager.export_session_to_markdown(session_data, str(output_path))
        assert result is False

    def test_get_recent_sessions(self, temp_log_dir):
        os.makedirs(temp_log_dir)
        # Create dummy session files
        filenames = ["session_2.json", "session_1.json", "session_3.json"]
        for fn in filenames:
            with open(os.path.join(temp_log_dir, fn), 'w') as f:
                f.write("{}")

        # Create non-session file
        with open(os.path.join(temp_log_dir, "other.txt"), 'w') as f:
            f.write("text")

        recent = FileManager.get_recent_sessions(log_dir=temp_log_dir, limit=2)
        assert len(recent) == 2
        # It sorts reverse-alphabetically (since filename starts with session_YYYYMMDD_HHMMSS, this sorts by latest)
        assert recent == ["session_3.json", "session_2.json"]

    def test_get_recent_sessions_no_dir(self, tmp_path):
        # directory does not exist
        missing_dir = str(tmp_path / "missing")
        recent = FileManager.get_recent_sessions(log_dir=missing_dir, limit=5)
        assert recent == []


class TestDeveloperMessages:
    def test_get_random_error_message(self):
        msg = DeveloperMessages.get_random_error_message()
        assert isinstance(msg, str)
        assert len(msg) > 0

    def test_get_credits(self):
        credits = DeveloperMessages.get_credits()
        assert isinstance(credits, str)
        assert "ChronoCoder" in credits
        assert "Anubhav" in credits

    def test_get_easter_egg_hint(self):
        hint = DeveloperMessages.get_easter_egg_hint()
        assert isinstance(hint, str)
        assert len(hint) > 0
