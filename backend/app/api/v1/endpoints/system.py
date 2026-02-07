import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    logger.debug("Health check requested")
    return {"status": "healthy"}

@router.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API."""
    logger.debug("Root endpoint requested")
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}
