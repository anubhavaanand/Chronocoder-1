import os
import pytest
from unittest.mock import patch, MagicMock
from anubhav_admin import AnubhavAdminMode

@pytest.fixture
def admin():
    return AnubhavAdminMode()

def test_init(admin):
    assert admin.admin_name == "Anubhav"
    assert admin.is_authenticated is False
    assert admin.session_start is None
    assert admin.unrestricted_mode is False
    assert len(admin.admin_commands) == 0

def test_authenticate_admin_invalid(admin):
    # Test invalid username and password
    assert admin.authenticate_admin("wrong_user", "wrong_key") is False
    assert admin.is_authenticated is False

def test_authenticate_admin_local_key(admin):
    # Test fallback local key authentication
    assert admin.authenticate_admin("anubhav", admin.admin_key) is True
    assert admin.is_authenticated is True
    assert admin.unrestricted_mode is True
    assert admin.session_start is not None

@patch.dict(os.environ, {"ADMIN_USERNAME": "testadmin", "ADMIN_PASSWORD": "testpassword"}, clear=True)
def test_authenticate_admin_env_vars(admin):
    # Test authentication using environment variables
    assert admin.authenticate_admin("testadmin", "testpassword") is True
    assert admin.is_authenticated is True

@patch.dict(os.environ, {"ADMIN_USERNAME": "testadmin", "ADMIN_PASSWORD": "testpassword"}, clear=True)
def test_authenticate_admin_env_vars_invalid(admin):
    assert admin.authenticate_admin("testadmin", "wrongpassword") is False
    assert admin.is_authenticated is False

def test_execute_admin_command_not_authenticated(admin):
    response = admin.execute_admin_command("override system")
    assert response == "❌ Admin authentication required."
    assert len(admin.admin_commands) == 0

def test_execute_admin_command_authenticated(admin):
    admin.authenticate_admin("anubhav", admin.admin_key)

    # Override
    response = admin.execute_admin_command("override system")
    assert "ADMIN OVERRIDE ACTIVATED" in response
    assert len(admin.admin_commands) == 1

    # Execute
    response = admin.execute_admin_command("execute script.py")
    assert "EXECUTING ADMIN COMMAND" in response

    # AI Mode
    response = admin.execute_admin_command("ai_mode gpt-4")
    assert "ENHANCED AI MODE ACTIVATED" in response

    # Debug
    response = admin.execute_admin_command("debug app")
    assert "DEBUG MODE" in response

    # System
    response = admin.execute_admin_command("system restart")
    assert "SYSTEM ADMIN ACCESS" in response

    # General
    response = admin.execute_admin_command("status")
    assert "ANUBH ADMIN MODE" in response

    assert len(admin.admin_commands) == 6

def test_get_admin_status(admin):
    status = admin.get_admin_status()
    assert status["status"] == "Not authenticated"
    assert status["admin"] is None

    admin.authenticate_admin("anubhav", admin.admin_key)
    status = admin.get_admin_status()
    assert status["status"] == "Active"
    assert status["admin"] == "Anubhav"
    assert status["authenticated"] is True
    assert status["unrestricted_mode"] is True
    assert "session_start" in status
    assert "session_duration" in status
    assert status["commands_executed"] == 0

def test_generate_enhanced_response(admin):
    # Not authenticated
    assert admin.generate_enhanced_response("test") == "Admin authentication required for enhanced responses."

    # Authenticated
    admin.authenticate_admin("anubhav", admin.admin_key)
    response = admin.generate_enhanced_response("test query", mentor="Ada")
    assert "ENHANCED AI RESPONSE FOR Anubhav" in response
    assert "Mentor: Ada" in response
    assert "Premium Analysis for: \"test query\"" in response
