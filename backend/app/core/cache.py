"""Simple in-memory cache for Aura responses."""

import time
from typing import Any


class AuraCache:
    """A simple TTL-based in-memory cache."""

    def __init__(self, ttl: int = 3600) -> None:
        """Initializes the cache.

        Args:
            ttl: Time-to-live in seconds.
        """
        self.ttl = ttl
        self._cache: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        """Retrieves an item from the cache.

        Args:
            key: The cache key.

        Returns:
            The cached value or None if not found or expired.
        """
        if key not in self._cache:
            return None

        timestamp, value = self._cache[key]
        if time.time() - timestamp > self.ttl:
            del self._cache[key]
            return None

        return value

    def set(self, key: str, value: Any) -> None:
        """Stores an item in the cache.

        Args:
            key: The cache key.
            value: The value to store.
        """
        self._cache[key] = (time.time(), value)

    def clear(self) -> None:
        """Clears the cache."""
        self._cache.clear()


# Global cache instance
explanation_cache = AuraCache(ttl=1800)  # 30 minutes
