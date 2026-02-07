"""Main entry point for the Aura Accessibility API."""

import logging
import os

from app.core.config import settings

# Compatibility mapping: PydanticAI often expects GOOGLE_API_KEY
# but our config uses GEMINI_API_KEY
if settings.GEMINI_API_KEY and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY

import time
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.logging import setup_logging

# Configure logging
setup_logging()
logger = logging.getLogger("app.main")

# Log configuration on startup
logger.info("--- Configuration Loaded ---")
for key, value in settings.model_dump().items():
    # Mask API keys for security
    if "api_key" in key.lower() and value:
        masked_value = value[:4] + "*" * (len(value) - 8) + value[-4:] if len(value) > 8 else "****"
        logger.info(f"{key}: {masked_value}")
    else:
        logger.info(f"{key}: {value}")
logger.info("---------------------------")

app = FastAPI(
    title="iNTUition 2026 Accessibility API",
    description="An AI-powered bridge for interface accessibility.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request: Request, call_next: Any) -> Any:
    start_time = time.perf_counter()
    
    # Log request details
    logger.info(f"Incoming: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.exception(f"Unhandled exception during {request.method} {request.url.path}: {e}")
        raise
        
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    logger.info(f"Outgoing: {request.method} {request.url.path} | Status: {response.status_code} | Duration: {process_time:.4f}s")
    return response

# Include all API routes
app.include_router(api_router)
