from app.agent.models.skeleton import PageSnapshot


def should_run_ai(snapshot: PageSnapshot) -> bool:
    """Phase 0: Cheap heuristic gate to avoid unnecessary LLM calls."""
    stats = snapshot.interaction_stats

    # 1. Struggle Detection (Time-based)
    if stats.get("idle_time", 0) > 10: # More lenient for real usage
        return True

    # 2. Confusion Signals (Scroll/Click)
    if stats.get("scroll_loops", 0) > 0:
        return True

    if stats.get("rage_clicks", 0) > 0:
        return True

    # 3. Structural Complexity (Heuristic)
    # If the DOM structure is very deep or has high element count
    if len(snapshot.dom_structure) > 10000:
        return True

    return False
