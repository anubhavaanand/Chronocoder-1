"""
Seed mentors table from JSON registry.
Run: python -m backend.db.seed_mentors
"""
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from supabase import create_client, Client

from backend.services.ai_service import resolve_mentors_dir

logger = logging.getLogger(__name__)

VALID_MENTOR_COLUMNS = {
    "mentor_id",
    "name",
    "era",
    "icon",
    "accent_color",
    "avatar_url",
    "system_prompt",
    "tone",
    "focus_areas",
    "feedback_schema",
    "few_shot_examples",
    "signature_opening",
    "signature_closing",
}


def get_supabase() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    return create_client(supabase_url, supabase_service_key)


def prepare_mentor_record(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and map a raw mentor JSON dictionary to the SQL schema columns.
    Ensures 'mentor_id' is present (mapping 'id' if necessary) and filters out
    unknown or disallowed keys.
    """
    mentor_id = data.get("mentor_id") or data.get("id")
    if not mentor_id:
        raise ValueError("Mentor record missing required 'mentor_id'")

    name = data.get("name")
    if not name:
        raise ValueError(f"Mentor '{mentor_id}' missing required 'name'")

    record: Dict[str, Any] = {
        "mentor_id": str(mentor_id),
        "name": str(name),
    }

    for col in VALID_MENTOR_COLUMNS:
        if col in ("mentor_id", "name"):
            continue
        if col in data:
            record[col] = data[col]

    return record


def seed_mentors(
    supabase: Optional[Any] = None,
    mentors_dir: Optional[Path | str] = None,
) -> List[Dict[str, Any]]:
    """
    Load all mentor JSON files and upsert them into the database.
    Accepts optional injected supabase client and custom mentors directory.
    """
    client = supabase if supabase is not None else get_supabase()
    target_dir = resolve_mentors_dir(mentors_dir)

    seeded_records: List[Dict[str, Any]] = []
    json_paths = sorted(target_dir.glob("*.json"))

    if not json_paths:
        logger.warning(f"No mentor JSON files found in {target_dir}")
        return seeded_records

    for path in json_paths:
        with open(path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        record = prepare_mentor_record(raw_data)
        # Upsert mentor
        result = client.table("mentors").upsert(record).execute()
        seeded_records.append(record)
        logger.info(f"Seeded {record['mentor_id']}: {result}")
        print(f"Seeded {record['mentor_id']}: {result}")

    print(f"All mentors seeded. Total: {len(seeded_records)}")
    return seeded_records


if __name__ == "__main__":
    seed_mentors()
