#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Per-mentor exhibition themes.

Each legendary programmer gets an era-authentic world: an exhibit label,
an era pigment, and a signature 3D scene rendered in the hero of their page.

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot
"""

MENTOR_THEMES = {
    "Ada Lovelace": {
        "exhibit_no": "Nº 01",
        "era_label": "The Analytical Salon",
        "era_year": "London, 1843",
        "accent": "#c08585",
        "accent_soft": "rgba(192, 133, 133, 0.14)",
        "tagline": "The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers and leaves.",
        "scene": "gears",
    },
    "Linus Torvalds": {
        "exhibit_no": "Nº 02",
        "era_label": "The Kernel Terminal",
        "era_year": "Helsinki, 1991",
        "accent": "#e0a458",
        "accent_soft": "rgba(224, 164, 88, 0.12)",
        "tagline": "Talk is cheap. Show me the code.",
        "scene": "donut",
    },
    "Grace Hopper": {
        "exhibit_no": "Nº 03",
        "era_label": "The Admiral's Deck",
        "era_year": "Harvard, 1947",
        "accent": "#7492ad",
        "accent_soft": "rgba(116, 146, 173, 0.13)",
        "tagline": "It's easier to ask forgiveness than it is to get permission.",
        "scene": "compass",
    },
    "Alan Turing": {
        "exhibit_no": "Nº 04",
        "era_label": "Bletchley Park",
        "era_year": "Milton Keynes, 1941",
        "accent": "#a3a380",
        "accent_soft": "rgba(163, 163, 128, 0.13)",
        "tagline": "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
        "scene": "rotors",
    },
    "Margaret Hamilton": {
        "exhibit_no": "Nº 05",
        "era_label": "Mission Control",
        "era_year": "MIT / Apollo 11, 1969",
        "accent": "#c4696f",
        "accent_soft": "rgba(196, 105, 111, 0.13)",
        "tagline": "I began to realize that the software was not getting the respect it deserved.",
        "scene": "orbit",
    },
    "Dennis Ritchie": {
        "exhibit_no": "Nº 06",
        "era_label": "Bell Labs",
        "era_year": "Murray Hill, 1973",
        "accent": "#9aa5ad",
        "accent_soft": "rgba(154, 165, 173, 0.12)",
        "tagline": "Unix is simple. It just takes a genius to understand its simplicity.",
        "scene": "pipeline",
    },
    "Barbara Liskov": {
        "exhibit_no": "Nº 07",
        "era_label": "The Blueprint Hall",
        "era_year": "MIT, 1987",
        "accent": "#6f87c4",
        "accent_soft": "rgba(111, 135, 196, 0.14)",
        "tagline": "What is wanted is that objects should be substitutable for one another without breaking the program.",
        "scene": "nested",
    },
    "Guido van Rossum": {
        "exhibit_no": "Nº 08",
        "era_label": "The Pythonic Workshop",
        "era_year": "CWI Amsterdam, 1990",
        "accent": "#d9b64e",
        "accent_soft": "rgba(217, 182, 78, 0.13)",
        "tagline": "Code is read much more often than it is written.",
        "scene": "knot",
    },
}


def get_mentor_theme(mentor_name: str) -> dict:
    """Return the exhibition theme for a mentor (brass default if unknown)."""
    return MENTOR_THEMES.get(
        mentor_name,
        {
            "exhibit_no": "Nº ??",
            "era_label": "The Archive",
            "era_year": "Unknown era",
            "accent": "#c9a227",
            "accent_soft": "rgba(201, 162, 39, 0.13)",
            "tagline": "",
            "scene": "gears",
        },
    )
