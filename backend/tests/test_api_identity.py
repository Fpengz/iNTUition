from unittest.mock import patch

import pytest

from app.schemas import UserProfile


@pytest.mark.asyncio
async def test_save_profile_endpoint(client):
    with patch("app.api.v1.endpoints.identity.save_profile") as mock_save:
        profile = {"aura_id": "user-1", "cognitive": {}}
        response = await client.post("/profile/save", json=profile)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert mock_save.called

@pytest.mark.asyncio
async def test_get_profile_endpoint(client):
    with patch("app.api.v1.endpoints.identity.load_profile") as mock_load:
        mock_load.return_value = UserProfile(aura_id="user-1")
        response = await client.get("/profile/user-1")
        assert response.status_code == 200
        assert response.json()["aura_id"] == "user-1"

@pytest.mark.asyncio
async def test_get_profile_not_found(client):
    with patch("app.api.v1.endpoints.identity.load_profile", return_value=None):
        response = await client.get("/profile/none")
        assert response.status_code == 404

@pytest.mark.asyncio
async def test_feedback_endpoint(client):
    with patch("app.api.v1.endpoints.identity.save_feedback") as mock_feedback:
        payload = {"aura_id": "u1", "url": "http://t.com", "helpful": True}
        response = await client.post("/feedback", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "received"
        assert mock_feedback.called
