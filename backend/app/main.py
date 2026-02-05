"""Main entry point for the Aura Accessibility API."""

import hashlib
import json
import logging
import re
import time
from collections.abc import AsyncGenerator
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import (
    BackgroundTasks,
    FastAPI,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import HttpUrl

from app.core.cache import explanation_cache
from app.core.distiller import DOMDistiller
from app.core.explainer import AuraExplainer
from app.core.tts import AuraTTS
from app.schemas import (
    ActionRequest,
    ActionResponse,
    DistilledData,
    DistilledElement,
    DOMData,
    ExplanationResponse,
    PrefetchRequest,
    TTSRequest,
    UserProfile,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="iNTUition Accessibility API")
explainer = AuraExplainer()
tts_synthesizer = AuraTTS()

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,  # ty:ignore[invalid-argument-type]
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Any) -> Any:
    """Middleware to add processing time to response headers.

    Args:
        request: The incoming FastAPI request.
        call_next: The next handler in the middleware chain.

    Returns:
        The response with the X-Process-Time header added.
    """
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(
        f"Request: {request.url.path} | Process Time: {process_time:.4f}s"
    )
    return response


def get_cache_key(
        distilled: DistilledData, profile: UserProfile | None
) -> str:
    """Generates a stable cache key based on distilled data and profile.

    Args:
        distilled: The distilled DOM data.
        profile: The user's accessibility profile.

    Returns:
        A unique MD5 hash representing the input state.
    """
    logger.debug(f"Generating cache key for distilled content of {distilled.url}")
    content = {
        "elements": [
            el.model_dump() for el in distilled.actions + distilled.summary
        ],
        "profile": profile.model_dump() if profile else None,
    }
    # Use a stable sort for keys to ensure consistent hashing
    data_str = json.dumps(content, sort_keys=True, default=str)
    key = hashlib.md5(data_str.encode()).hexdigest()
    logger.debug(f"Cache key generated: {key}")
    return key


async def prefetch_and_cache(url: HttpUrl) -> None:
    """Background task to fetch a URL, get a summary, and cache it.

    Args:
        url: The URL to prefetch and process.
    """
    logger.info(f"Speculative Prefetch started for URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            logger.debug(f"Fetching HTML for prefetch: {url}")
            response = await client.get(
                str(url), follow_redirects=True, timeout=10.0
            )
            response.raise_for_status()
            html = response.text

        # Distill the HTML content properly
        logger.debug(f"Distilling prefetched HTML: {url}")
        distilled_data = DOMDistiller.distill_html(html, str(url))

        logger.debug(f"Explaining prefetched content: {url}")
        explanation_model = await explainer.explain_page(distilled_data, None)

        cache_key = get_cache_key(distilled_data, None)
        explanation_cache.set(cache_key, explanation_model.model_dump())
        logger.info(f"Successfully prefetched and cached: {url} | Key: {cache_key}")

    except Exception as e:
        logger.error(f"Failed to prefetch {url}: {e}", exc_info=True)


@app.post("/prefetch")
async def prefetch(
        request_body: PrefetchRequest,
        background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """Accepts a URL for speculative processing and caching.

    Args:
        request_body: The prefetch request containing the URL.
        background_tasks: FastAPI background tasks handler.

    Returns:
        A confirmation message.
    """
    logger.info(f"Received prefetch request for: {request_body.url}")
    background_tasks.add_task(prefetch_and_cache, request_body.url)
    return {"message": "URL accepted for prefetching."}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API.

    Returns:
        A welcome message.
    """
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}


@app.post("/explain", response_model=dict[str, Any])
async def explain(
        request: Request,
        profile: UserProfile | None = None,
) -> dict[str, Any]:
    """Explains a web page based on distilled DOM data.

    Args:
        request: The incoming request containing 'dom_data'.
        profile: Optional user accessibility profile.

    Returns:
        A dictionary containing the explanation and distilled data.
    """
    try:
        body = await request.json()
        raw_dom = body.get("dom_data")
        if not raw_dom:
            logger.warning("Request missing 'dom_data'")
            return Response(
                content=json.dumps({"error": "Missing dom_data"}),
                status_code=422,
                media_type="application/json",
            )

        user_profile = profile or (
            UserProfile(**body.get("profile")) if body.get("profile") else None
        )

        dom_data = DOMData(**raw_dom)
        logger.info(f"Explaining page: {dom_data.url}")
        distilled = DOMDistiller.distill(dom_data)

        cache_key = get_cache_key(distilled, user_profile)
        cached_explanation = explanation_cache.get(cache_key)

        if cached_explanation:
            logger.info(
                f"Cache HIT for URL: {dom_data.url} | Key: {cache_key}"
            )
            return {
                "explanation": ExplanationResponse(**cached_explanation),
                "distilled": distilled,
                "cached": True,
            }

        logger.info(f"Cache MISS for URL: {dom_data.url} | Requesting LLM...")
        explanation_model = await explainer.explain_page(
            distilled, user_profile
        )
        explanation_cache.set(cache_key, explanation_model.model_dump())

        return {
            "explanation": explanation_model,
            "distilled": distilled,
            "cached": False,
        }
    except Exception as e:
        logger.exception(f"Unhandled error in /explain: {e}")
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json",
        )


@app.post("/explain/stream")
async def explain_stream(
        request: Request,
        profile: UserProfile | None = None,
) -> StreamingResponse:
    """Streams a structured explanation of a web page for an Adaptive Card.

    Args:
        request: The incoming request containing 'dom_data' and 'profile'.
        profile: Optional user accessibility profile (can also be in body).

    Returns:
        A streaming response with JSON objects for the Adaptive Card.
    """
    try:
        body = await request.json()
        raw_dom = body.get("dom_data")
        if not raw_dom:
            logger.error("No 'dom_data' found in request body.")
            return Response(
                content=json.dumps({"error": "Missing dom_data"}),
                status_code=422,
                media_type="application/json",
            )

        # Use the same profile logic
        user_profile = profile or (
            UserProfile(**body.get("profile")) if body.get("profile") else None
        )

        logger.info(f"Received stream request for URL: {raw_dom.get('url')}")

        try:
            dom_data = DOMData(**raw_dom)
        except Exception as ve:
            logger.error(f"DOMData validation failed: {ve}")
            return Response(
                content=json.dumps(
                    {"error": f"Invalid DOM structure: {str(ve)}"}
                ),
                status_code=422,
                media_type="application/json",
            )

        distilled = DOMDistiller.distill(dom_data)
        cache_key = get_cache_key(distilled, user_profile)
        cached_explanation = explanation_cache.get(cache_key)

        async def event_generator() -> AsyncGenerator[str, None]:
            try:
                if cached_explanation and isinstance(cached_explanation, dict):
                    logger.info(
                        f"Streaming cached explanation for URL: {dom_data.url}"
                    )
                    if cached_explanation.get("summary"):
                        summary_data = {
                            "type": "summary",
                            "content": cached_explanation["summary"],
                        }
                        yield f"data: {json.dumps(summary_data)}\n\n"
                    if cached_explanation.get("actions"):
                        for action_text in cached_explanation["actions"]:
                            action_data = {
                                "type": "action",
                                "content": action_text,
                            }
                            yield f"data: {json.dumps(action_data)}\n\n"
                    return

                full_response_for_cache = {"summary": "", "actions": []}

                async for json_chunk_str in explainer.stream_explanation(
                        distilled, user_profile
                ):
                    yield f"data: {json_chunk_str}\n\n"

                    try:
                        chunk_data = json.loads(json_chunk_str)
                        if chunk_data.get("type") == "summary":
                            full_response_for_cache[
                                "summary"
                            ] += chunk_data.get("content", "")
                        elif chunk_data.get("type") == "action":
                            full_response_for_cache["actions"].append(
                                chunk_data.get("content", "")
                            )
                    except json.JSONDecodeError:
                        logger.warning(
                            f"Failed to decode JSON chunk: {json_chunk_str}"
                        )

                if full_response_for_cache["summary"]:
                    explanation_cache.set(cache_key, full_response_for_cache)
                    logger.info(
                        f"Cached new explanation for URL: {dom_data.url}"
                    )
            except Exception as e:
                logger.error(f"Error in stream generator: {e}")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        return StreamingResponse(
            event_generator(), media_type="text/event-stream"
        )
    except Exception as e:
        logger.exception(f"Unhandled error in /explain/stream: {e}")
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json",
        )


@app.post("/action", response_model=ActionResponse)
async def action(
        request_body: ActionRequest,
) -> ActionResponse:
    """Finds a specific action on the page based on a user query.

    Args:
        request_body: Contains the raw DOM data and the user's query.

    Returns:
        The mapped action response.
    """
    # Ensure we pass the DOMData model to the distiller
    # If request_body.dom_data is a dict, we should convert it or fix schema
    if isinstance(request_body.dom_data, dict):
        dom_data = DOMData(**request_body.dom_data)
    else:
        dom_data = request_body.dom_data

    distilled = DOMDistiller.distill(dom_data)
    result = await explainer.find_action(distilled, request_body.query)
    return result


@app.post("/tts")
async def text_to_speech(
        request_body: TTSRequest,
) -> Response:
    """Synthesizes speech from text.

    Args:
        request_body: Contains the text to convert to speech.

    Returns:
        An audio response containing the MP3 data.
    """
    try:
        audio_bytes = tts_synthesizer.synthesize_speech(request_body.text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS endpoint error: {e}")
        return Response(
            content=json.dumps({"error": f"TTS Error: {e}"}),
            status_code=500,
            media_type="application/json",
        )


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        The status of the API.
    """
    return {"status": "healthy"}
