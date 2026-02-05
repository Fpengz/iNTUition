"""Main entry point for the Aura Accessibility API."""

import hashlib
import json
import time
from typing import Annotated, Any, AsyncGenerator

from dotenv import load_dotenv
from fastapi import Body, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.cache import explanation_cache
from app.core.distiller import DOMDistiller
from app.core.explainer import AuraExplainer

load_dotenv()

app = FastAPI(title="iNTUition Accessibility API")
explainer = AuraExplainer()

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
    print(f"Request: {request.url.path} | Process Time: {process_time:.4f}s")
    return response


def get_cache_key(distilled: dict[str, Any], profile: dict[str, Any] | None) -> str:
    """Generates a stable cache key based on distilled data and profile."""
    content = {
        "elements": distilled.get("actions", []) + distilled.get("summary", []),
        "profile": profile,
    }
    # Use a stable sort for keys to ensure consistent hashing
    data_str = json.dumps(content, sort_keys=True)
    return hashlib.md5(data_str.encode()).hexdigest()


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API.

    Returns:
        A welcome message.
    """
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}


@app.post("/explain")
async def explain(
    dom_data: Annotated[dict[str, Any], Body(...)],
    profile: Annotated[dict[str, Any] | None, Body()] = None,
) -> dict[str, Any]:
    """Explains a web page based on distilled DOM data.

    Args:
        dom_data: The raw DOM data from the frontend.
        profile: Optional user accessibility profile.

    Returns:
        A dictionary containing the explanation and distilled data.
    """
    distilled = DOMDistiller.distill(dom_data)
    
    # Check cache
    cache_key = get_cache_key(distilled, profile)
    cached_explanation = explanation_cache.get(cache_key)
    
    if cached_explanation:
        return {
            "explanation": cached_explanation, 
            "distilled": distilled,
            "cached": True
        }

    explanation = await explainer.explain_page(distilled, profile)
    
    return {"explanation": explanation, "distilled": distilled, "cached": False}


@app.post("/explain/stream")
async def explain_stream(
    dom_data: Annotated[dict[str, Any], Body(...)],
    profile: Annotated[dict[str, Any] | None, Body()] = None,
) -> StreamingResponse:
    """Streams an explanation of a web page.

    Args:
        dom_data: The raw DOM data from the frontend.
        profile: Optional user accessibility profile.

    Returns:
        A streaming response with the explanation.
    """
    distilled = DOMDistiller.distill(dom_data)
    
    # Check cache
    cache_key = get_cache_key(distilled, profile)
    cached_explanation = explanation_cache.get(cache_key)

    async def event_generator() -> AsyncGenerator[str, None]:
        if cached_explanation:
            # For cached content, we yield it in one go or simulated chunks
            yield f"data: {json.dumps({'chunk': cached_explanation, 'cached': True})}\n\n"
            return

        full_content = []
        async for chunk in explainer.stream_explanation(distilled, profile):
            full_content.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk, 'cached': False})}\n\n"
        
        # Save to cache after streaming completes
        explanation_cache.set(cache_key, "".join(full_content))

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/action")
async def action(
    dom_data: Annotated[dict[str, Any], Body(...)],
    query: Annotated[str, Body(...)],
) -> dict[str, Any]:
    """Finds a specific action on the page based on a user query.

    Args:
        dom_data: The raw DOM data from the frontend.
        query: The user's natural language query.

    Returns:
        A dictionary containing the mapped action or an error.
    """
    distilled = DOMDistiller.distill(dom_data)
    result = await explainer.find_action(distilled, query)
    return result


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        The status of the API.
    """
    return {"status": "healthy"}

