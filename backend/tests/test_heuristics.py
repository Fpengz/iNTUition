from app.agent.core.heuristics import should_run_ai
from app.agent.models.skeleton import PageSnapshot


def test_should_run_ai_idle_time():
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="test",
        interaction_stats={"idle_time": 15}
    )
    assert should_run_ai(snapshot) is True

    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="test",
        interaction_stats={"idle_time": 5}
    )
    assert should_run_ai(snapshot) is False

def test_should_run_ai_confusion_signals():
    # Scroll loops
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="test",
        interaction_stats={"scroll_loops": 5}
    )
    assert should_run_ai(snapshot) is True

    # Rage clicks
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="test",
        interaction_stats={"rage_clicks": 3}
    )
    assert should_run_ai(snapshot) is True

def test_should_run_ai_complexity():
    # Large structure
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="A" * 11000,
        interaction_stats={}
    )
    assert should_run_ai(snapshot) is True

    # Normal structure
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="A" * 1000,
        interaction_stats={}
    )
    assert should_run_ai(snapshot) is False

def test_should_run_ai_empty_stats():
    snapshot = PageSnapshot(
        url="http://test.com",
        dom_text="test",
        dom_structure="test",
        interaction_stats={}
    )
    assert should_run_ai(snapshot) is False
