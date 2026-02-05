"""Main entry point for the Aura Accessibility API."""

import logging
from typing import Annotated, Any, AsyncGenerator, Dict, Optional # Added Dict, Optional
import re
import httpx

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Body, FastAPI, Request, HTTPException # Added HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from app.core.tts import AuraTTS

from app.core.cache import explanation_cache
from app.core.distiller import DOMDistiller
from app.core.explainer import AuraExplainer
from app.schemas import DOMData, UserProfile, ExplanationResponse, ActionRequest, ActionResponse, TTSRequest, PrefetchRequest, DistilledData # Import schemas

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="iNTUition Accessibility API")
explainer = AuraExplainer()
tts_synthesizer = AuraTTS()

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


def get_cache_key(distilled: DistilledData, profile: Optional[UserProfile]) -> str: # Use Pydantic models
    """Generates a stable cache key based on distilled data and profile."""
    content = {
        "elements": distilled.actions + distilled.summary, # Access via model attributes
        "profile": profile.dict() if profile else None,
    }
    # Use a stable sort for keys to ensure consistent hashing
    data_str = json.dumps(content, sort_keys=True, default=str) # default=str for HttpUrl
    return hashlib.md5(data_str.encode()).hexdigest()

async def prefetch_and_cache(url: HttpUrl): # Use HttpUrl from Pydantic
    """
    Background task to fetch a URL, get a summary, and cache it.
    NOTE: This is a naive implementation and will not work for Single Page Applications.
    """
    logger.info(f"Prefetching URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(str(url), follow_redirects=True, timeout=10.0)
            response.raise_for_status()
            html = response.text

        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        title = title_match.group(1) if title_match else "No Title Found"
        
        # Create a simplified DistilledData model for caching
        distilled_data_for_cache = DistilledData(
            title=title,
            url=url,
            summary=[{"r": "text", "t": "Prefetched content...", "v": True}], # Simplified
            actions=[],
        )

        explanation_obj = await explainer.explain_page(distilled_data_for_cache.dict(), None) # Pass dict for now

        if "error" not in explanation_obj:
            # Reconstruct ExplanationResponse to store in cache
            cached_explanation = ExplanationResponse(**explanation_obj)
            cache_key = get_cache_key(distilled_data_for_cache, None)
            explanation_cache.set(cache_key, cached_explanation.dict()) # Cache the dict representation
            logger.info(f"Successfully prefetched and cached: {url}")

    except Exception as e:
        logger.error(f"Failed to prefetch {url}: {e}")

@app.post("/prefetch")
async def prefetch(
    request_body: PrefetchRequest, # Use Pydantic model
    background_tasks: BackgroundTasks,
) -> Dict[str, str]:
    """
    Accepts a URL for speculative processing and caching.
    Responds immediately and processes in the background.
    """
    background_tasks.add_task(prefetch_and_cache, request_body.url)
    return {"message": "URL accepted for prefetching."}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint for the API.

    Returns:
        A welcome message.
    """
    return {"message": "Welcome to iNTUition 2026 Accessibility API"}


@app.post("/explain", response_model=Dict[str, Any]) # Response model needs adjustment for explanation+distilled+cached
async def explain(
    dom_data: DOMData, # Use Pydantic model
    profile: Optional[UserProfile] = None,
) -> Dict[str, Any]:
    """Explains a web page based on distilled DOM data.

    Args:
        dom_data: The raw DOM data from the frontend.
        profile: Optional user accessibility profile.

    Returns:
        A dictionary containing the explanation and distilled data.
    """
    distilled = DOMDistiller.distill(dom_data.dict()) # Pass dict for now
    distilled_model = DistilledData(**distilled) # Convert to Pydantic model

    cache_key = get_cache_key(distilled_model, profile)
    cached_explanation = explanation_cache.get(cache_key)
    
    if cached_explanation:
        logger.info(f"Returning cached explanation for URL: {dom_data.url}")
        return {
            "explanation": ExplanationResponse(**cached_explanation), # Convert back to model
            "distilled": distilled_model,
            "cached": True
        }

    explanation_obj = await explainer.explain_page(distilled_model.dict(), profile) # Pass dict for now
    explanation_model = ExplanationResponse(**explanation_obj) # Convert to model
    
    explanation_cache.set(cache_key, explanation_model.dict()) # Cache the dict representation
    
    return {
        "explanation": explanation_model,
        "distilled": distilled_model,
        "cached": False
    }


@app.post("/explain/stream") # No response_model for StreamingResponse
async def explain_stream(
    dom_data: DOMData, # Use Pydantic model
    profile: Optional[UserProfile] = None,
) -> StreamingResponse:
    """Streams a structured explanation of a web page for an Adaptive Card.

    Args:
        dom_data: The raw DOM data from the frontend.
        profile: Optional user accessibility profile.

    Returns:
        A streaming response with JSON objects for the Adaptive Card.
    """
    distilled = DOMDistiller.distill(dom_data.dict()) # Pass dict for now
    distilled_model = DistilledData(**distilled) # Convert to Pydantic model
    
    cache_key = get_cache_key(distilled_model, profile)
    cached_explanation = explanation_cache.get(cache_key)

    async def event_generator() -> AsyncGenerator[str, None]:
        if cached_explanation and isinstance(cached_explanation, dict):
            # If cache exists, stream its parts
            logger.info(f"Streaming cached explanation for URL: {dom_data.url}")
            if cached_explanation.get("summary"):
                yield f"data: {json.dumps({'type': 'summary', 'content': cached_explanation['summary']})}\n\n"
            if cached_explanation.get("actions"):
                for action in cached_explanation["actions"]:
                    yield f"data: {json.dumps({'type': 'action', 'content': action})}\n\n"
            return

        # To cache the full response, we need to build it up
        full_response_for_cache = {"summary": "", "actions": []}
        
        async for json_chunk_str in explainer.stream_explanation(distilled_model.dict(), profile): # Pass dict for now
            # Each chunk is a JSON string, send it to the client
            yield f"data: {json_chunk_str}\n\n"
            
            # Also, parse it to build up the object for caching
            try:
                chunk_data = json.loads(json_chunk_str)
                if chunk_data.get("type") == "summary":
                    full_response_for_cache["summary"] = chunk_data.get("content", "")
                elif chunk_data.get("type") == "action":
                    full_response_for_cache["actions"].append(chunk_data.get("content", ""))
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode JSON chunk during streaming: {json_chunk_str}")
                pass
        
        # Save the complete object to cache after the stream is finished
        if full_response_for_cache["summary"]: # Only cache if we got a summary
            explanation_cache.set(cache_key, full_response_for_cache)
            logger.info(f"Generated and cached new explanation for URL: {dom_data.url}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/action", response_model=ActionResponse)
async def action(
    request_body: ActionRequest, # Use Pydantic model
) -> ActionResponse:
    """Finds a specific action on the page based on a user query.

    Args:
        request_body: Contains the raw DOM data and the user's natural language query.

    Returns:
        A dictionary containing the mapped action or an error.
    """
    distilled = DOMDistiller.distill(request_body.dom_data) # Pass dict from model
    result = await explainer.find_action(distilled, request_body.query)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return ActionResponse(**result)


@app.post("/tts") # No response_model for raw audio
async def text_to_speech(
    request_body: TTSRequest, # Use Pydantic model
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
async def health() -> Dict[str, str]:
    """Health check endpoint.

    Returns:
        The status of the API.
    """
    return {"status": "healthy"}