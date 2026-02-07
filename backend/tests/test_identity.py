import sqlite3
from unittest.mock import patch

import pytest

from app.core import identity
from app.schemas import UserProfile


@pytest.fixture
def temp_db(tmp_path):
    db_file = tmp_path / "test_identity.db"
    with patch("app.core.identity.DB_PATH", str(db_file)):
        identity.init_db()
        yield str(db_file)

def test_save_and_load_profile(temp_db):
    profile = UserProfile(aura_id="test-123")
    identity.save_profile(profile)

    loaded = identity.load_profile("test-123")
    assert loaded.aura_id == "test-123"

    # Load non-existent
    assert identity.load_profile("none") is None

def test_save_feedback(temp_db):
    identity.save_feedback("test-user", "http://test.com", True, "Great")

    with sqlite3.connect(temp_db) as conn:
        cursor = conn.execute("SELECT aura_id, helpful, comment FROM feedback")
        row = cursor.fetchone()
        assert row[0] == "test-user"
        assert row[1] == 1
        assert row[2] == "Great"
