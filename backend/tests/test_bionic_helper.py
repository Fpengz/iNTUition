from app.agent.core.bionic_helper import should_apply_bionic
from app.schemas import CognitiveProfile, UserProfile


def test_should_apply_bionic_support_level():
    profile = UserProfile(cognitive=CognitiveProfile(support_level="high"))
    assert should_apply_bionic(profile) is True

    profile = UserProfile(cognitive=CognitiveProfile(support_level="medium"))
    assert should_apply_bionic(profile) is True

    profile = UserProfile(cognitive=CognitiveProfile(support_level="low", reduce_distractions=False))
    assert should_apply_bionic(profile) is False

def test_should_apply_bionic_reduce_distractions():
    profile = UserProfile(cognitive=CognitiveProfile(support_level="none", reduce_distractions=True))
    assert should_apply_bionic(profile) is True

    profile = UserProfile(cognitive=CognitiveProfile(support_level="none", reduce_distractions=False))
    assert should_apply_bionic(profile) is False
