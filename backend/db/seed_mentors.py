"""
Seed mentors table from JSON registry.
Run: python -m backend.db.seed_mentors
"""
import json
import os
from pathlib import Path
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MENTORS_DIR = Path(__file__).parent.parent / "mentors"


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def seed_mentors():
    supabase = get_supabase()
    for path in MENTORS_DIR.glob("*.json"):
        with open(path, "r") as f:
            data = json.load(f)

        # Upsert mentor
        result = supabase.table("mentors").upsert(data).execute()
        print(f"Seeded {data['mentor_id']}: {result}")

    print("All mentors seeded.")


if __name__ == "__main__":
    seed_mentors()