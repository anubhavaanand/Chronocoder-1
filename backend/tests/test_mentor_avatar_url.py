"""avatar_url absolutisation (#276).

Mentor configs store a frontend-relative path (`/mentors/ada_lovelace.jpg`),
which only resolves against the Next.js origin. When `PUBLIC_BASE_URL` is set,
the API has to emit an absolute URL; when it is unset the relative form is
returned unchanged so existing consumers keep working.
"""

import backend.main as backend_main


def test_relative_when_public_base_url_is_unset(monkeypatch):
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "")

    assert (
        backend_main._with_public_base("/mentors/ada_lovelace.jpg") == "/mentors/ada_lovelace.jpg"
    )


def test_absolutised_when_public_base_url_is_set(monkeypatch):
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "https://chronocoder.app")

    assert (
        backend_main._with_public_base("/mentors/ada_lovelace.jpg")
        == "https://chronocoder.app/mentors/ada_lovelace.jpg"
    )


def test_trailing_slash_on_base_url_is_not_doubled(monkeypatch):
    """PUBLIC_BASE_URL is rstripped once at import, so no `//` is produced."""
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "https://chronocoder.app")

    assert (
        backend_main._with_public_base("/mentors/ada_lovelace.jpg")
        == "https://chronocoder.app/mentors/ada_lovelace.jpg"
    )


def test_already_absolute_url_is_left_alone(monkeypatch):
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "https://chronocoder.app")

    assert (
        backend_main._with_public_base("https://cdn.example.com/ada.jpg")
        == "https://cdn.example.com/ada.jpg"
    )


def test_none_avatar_stays_none(monkeypatch):
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "https://chronocoder.app")

    assert backend_main._with_public_base(None) is None


def test_endpoint_returns_relative_path_without_public_base_url(monkeypatch):
    """Default (no PUBLIC_BASE_URL) keeps the historical relative shape."""
    monkeypatch.setattr(backend_main, "PUBLIC_BASE_URL", "")

    from fastapi.testclient import TestClient

    client = TestClient(backend_main.app)
    response = client.get("/api/mentors/ada_lovelace")

    assert response.status_code == 200
    avatar_url = response.json()["avatar_url"]
    assert avatar_url.startswith("/mentors/")
    assert "://" not in avatar_url
