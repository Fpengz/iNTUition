from fastapi import APIRouter

from app.api.v1.endpoints import accessibility, identity, system

api_router = APIRouter()

# Combine routers
# System routes at root
api_router.include_router(system.router, tags=["system"])

# Versioned feature routes
api_router.include_router(accessibility.router, tags=["accessibility"])
api_router.include_router(identity.router, tags=["identity"])
