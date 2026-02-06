from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}

@router.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API."""
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}
