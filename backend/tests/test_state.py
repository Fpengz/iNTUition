from app.agent.core.state import AgentState, SessionStore


def test_agent_state_methods():
    state = AgentState()
    state.add_message("user", "hi")
    assert len(state.conversation_history) == 1
    assert state.conversation_history[0]["role"] == "user"

    state.update_context("http://test.com", "Summary")
    assert state.current_url == "http://test.com"
    assert state.dom_summary == "Summary"

    state.clear()
    assert state.conversation_history == []
    assert state.current_url is None

def test_session_store():
    store = SessionStore()
    s1 = store.get_session("id1")
    s2 = store.get_session("id1")
    assert s1 is s2

    store.clear_session("id1")
    s3 = store.get_session("id1")
    assert s3 is not s1

    # Clear non-existent
    store.clear_session("none")
