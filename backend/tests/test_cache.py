import time

from app.core.cache import AuraCache


def test_cache_set_get():
    cache = AuraCache(ttl=60)
    cache.set("k1", "v1")
    assert cache.get("k1") == "v1"
    assert cache.get("none") is None

def test_cache_expiration():
    cache = AuraCache(ttl=0.1)
    cache.set("k1", "v1")
    time.sleep(0.2)
    assert cache.get("k1") is None

def test_cache_clear():
    cache = AuraCache()
    cache.set("k1", "v1")
    cache.clear()
    assert cache.get("k1") is None
