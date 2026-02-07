from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class BaseTool(ABC):
    """Abstract base class for all Aura Agent tools."""

    name: str
    description: str
    args_schema: type[BaseModel]

    @abstractmethod
    async def run(self, **kwargs: Any) -> Any:
        """Executes the tool logic.

        Args:
            **kwargs: The input arguments, validated against args_schema.

        Returns:
            The output of the tool.
        """
        pass
