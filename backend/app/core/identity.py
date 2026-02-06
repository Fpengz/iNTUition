import sqlite3
import json
import logging
from app.schemas import UserProfile

logger = logging.getLogger(__name__)

DB_PATH = "aura_identity.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                aura_id TEXT PRIMARY KEY,
                profile_json TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aura_id TEXT,
                url TEXT,
                helpful INTEGER,
                comment TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

def save_profile(profile: UserProfile):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO profiles (aura_id, profile_json) VALUES (?, ?)",
            (profile.aura_id, profile.model_dump_json())
        )
    logger.info(f"Identity: Saved profile for {profile.aura_id}")

def load_profile(aura_id: str) -> UserProfile | None:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT profile_json FROM profiles WHERE aura_id = ?", (aura_id,))
        row = cursor.fetchone()
        if row:
            return UserProfile.model_validate_json(row[0])
    return None

def save_feedback(aura_id: str, url: str, helpful: bool, comment: str | None = None):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO feedback (aura_id, url, helpful, comment) VALUES (?, ?, ?, ?)",
            (aura_id, url, 1 if helpful else 0, comment)
        )
    logger.info(f"Identity: Feedback received from {aura_id} for {url} (Helpful: {helpful})")

# Initialize on import for simplicity in a demo
init_db()