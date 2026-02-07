from app.schemas import UserProfile


def should_apply_bionic(profile: UserProfile) -> bool:
    """Determines if Bionic Reading should be applied based on the user's profile.
    Specifically targets ADHD/Attention deficit patterns.
    """
    # Check explicitly if it's a requested modality if we add that later
    # For now, infer from cognitive profile
    if profile.cognitive.support_level in ["medium", "high"]:
        return True

    if profile.cognitive.reduce_distractions:
        return True

    return False
