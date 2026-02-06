import json
from fastapi import APIRouter, Response
from app.schemas import FeedbackRequest, UserProfile
from app.core.identity import save_profile, load_profile, save_feedback

router = APIRouter()

@router.post("/feedback")
async def receive_feedback(feedback: FeedbackRequest):
    """Receives user feedback on an adaptation."""
    save_feedback(feedback.aura_id, feedback.url, feedback.helpful, feedback.comment)
    return {"status": "received"}

@router.post("/profile/save")
async def save_user_profile(profile: UserProfile):
    """Saves a persistent user profile to the identity store."""
    save_profile(profile)
    return {"status": "success", "aura_id": profile.aura_id}

@router.get("/profile/{aura_id}")
async def get_user_profile(aura_id: str):
    """Fetches a persistent user profile."""
    profile = load_profile(aura_id)
    if not profile:
        return Response(status_code=404, content=json.dumps({"error": "Profile not found"}), media_type="application/json")
    return profile
