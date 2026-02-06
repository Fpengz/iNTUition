"""Main entry point for the Aura Accessibility API."""

import os
import logging
from app.core.config import settings

# Compatibility mapping: PydanticAI often expects GOOGLE_API_KEY 
# but our config uses GEMINI_API_KEY
if settings.GEMINI_API_KEY and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
import time
from fastapi import Request
from typing import Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

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
async def add_process_time_header(request: Request, call_next: Any) -> Any:
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Request: {request.url.path} | Process Time: {process_time:.4f}s")
    return response

# Include all API routes
app.include_router(api_router)