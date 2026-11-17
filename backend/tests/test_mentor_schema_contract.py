"""Mentor schema contract: backend/mentors/*.json <-> src/data/mentors.ts (#290)."""

import json
import re

from scripts.generate_mentor_data import MENTORS_DIR, ORDER, OUT_FILE, build_content


def test_mentors_ts_matches_generated_output():
    """Committed frontend catalog must equal the generator output byte-for-byte."""
    assert OUT_FILE.read_text(encoding="utf-8") == build_content()


def test_json_registry_matches_generator_order():
    """Every JSON persona is in ORDER and vice versa."""
    assert {path.stem for path in MENTORS_DIR.glob("*.json")} == set(ORDER)


def test_feedback_section_ids_match_generated_ts():
    """Each JSON feedback_schema.sections ids equal src/data/mentors.ts feedbackSections."""
    ts = OUT_FILE.read_text(encoding="utf-8")
    for mentor_id in ORDER:
        data = json.loads((MENTORS_DIR / f"{mentor_id}.json").read_text(encoding="utf-8"))
        expected = [section["id"] for section in data["feedback_schema"]["sections"]]
        start = ts.index(f'id: "{mentor_id}",')
        block = ts[start : ts.index("\n  },", start)]
        generated = re.findall(r'id: "([^"]+)"', block.split("feedbackSections: [", 1)[1])
        assert generated == expected, f"section id drift for {mentor_id}"