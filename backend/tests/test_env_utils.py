"""Tests for the fail-soft environment helpers (#280)."""

from backend.utils.env import env_int


def test_env_int_returns_default_when_unset(monkeypatch):
    monkeypatch.delenv("MAX_WS_CONNECTIONS", raising=False)
    assert env_int("MAX_WS_CONNECTIONS", 1000) == 1000


def test_env_int_parses_valid_value(monkeypatch):
    monkeypatch.setenv("MAX_WS_CONNECTIONS", "42")
    assert env_int("MAX_WS_CONNECTIONS", 1000) == 42


def test_env_int_falls_back_on_malformed_value(monkeypatch):
    monkeypatch.setenv("MAX_WS_CONNECTIONS", "1e3")
    assert env_int("MAX_WS_CONNECTIONS", 1000) == 1000


def test_env_int_falls_back_on_blank_value(monkeypatch):
    monkeypatch.setenv("MAX_WS_CONNECTIONS", "   ")
    assert env_int("MAX_WS_CONNECTIONS", 1000) == 1000