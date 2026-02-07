import json
import logging

from fastapi import APIRouter, Response

from app.core.identity import load_profile, save_feedback, save_profile
from app.schemas import FeedbackRequest, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/feedback")
async def receive_feedback(feedback: FeedbackRequest):
    """Receives user feedback on an adaptation."""
    logger.info(f"Feedback received from {feedback.aura_id} for URL: {feedback.url} | Helpful: {feedback.helpful}")
    save_feedback(feedback.aura_id, feedback.url, feedback.helpful, feedback.comment)
    return {"status": "received"}

@router.post("/profile/save")
async def save_user_profile(profile: UserProfile):
    """Saves a persistent user profile to the identity store."""
    logger.info(f"Saving profile for {profile.aura_id}")
    save_profile(profile)
    return {"status": "success", "aura_id": profile.aura_id}

@router.get("/profile/{aura_id}")
async def get_user_profile(aura_id: str):
    """Fetches a persistent user profile."""
    logger.info(f"Loading profile for {aura_id}")
    profile = load_profile(aura_id)
    if not profile:
        logger.warning(f"Profile not found for {aura_id}")
        return Response(status_code=404, content=json.dumps({"error": "Profile not found"}), media_type="application/json")
    return profile
