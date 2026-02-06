import json
import logging
import hashlib
import time
from typing import Any
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Request, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
import httpx

from app.schemas import (
    DOMData,
    UserProfile,
    PrefetchRequest,
    ExplanationResponse,
    ActionRequest,
    ActionResponse,
    TTSRequest,
    DistilledData,
    VerificationRequest,
)
from app.core.distiller import DOMDistiller
from app.core.explainer import AuraExplainer
from app.core.tts import AuraTTS
from app.core.cache import explanation_cache
from app.agent.core.agent import AuraAgent
from app.agent.core.runtime import AccessibilityRuntime
from app.agent.tools.distiller_tool import DistillerTool
from app.agent.tools.explainer_tool import ExplainerTool
from app.agent.tools.tts_tool import TTSTool
from app.agent.agents.vision import vision_judge_agent

logger = logging.getLogger(__name__)

router = APIRouter()
explainer = AuraExplainer()
tts_synthesizer = AuraTTS()

# Initialize Agentic Components
agent = AuraAgent([
    DistillerTool(),
    ExplainerTool(),
    TTSTool()
])
runtime = AccessibilityRuntime()

def get_cache_key(distilled: DistilledData, profile: UserProfile | None) -> str:
    """Generates a stable cache key based on distilled data and profile."""
    content = {
        "elements": [
            el.model_dump() for el in distilled.actions + distilled.summary
        ],
        "profile": profile.model_dump() if profile else None,
    }
    data_str = json.dumps(content, sort_keys=True, default=str)
    return hashlib.md5(data_str.encode()).hexdigest()

async def prefetch_and_cache(url: Any) -> None:
    """Background task to fetch a URL, get a summary, and cache it."""
    logger.info(f"Speculative Prefetch started for URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(str(url), follow_redirects=True, timeout=10.0)
            response.raise_for_status()
            html = response.text

        distilled_data = DOMDistiller.distill_html(html, str(url))
        explanation_model = await explainer.explain_page(distilled_data, None)

        cache_key = get_cache_key(distilled_data, None)
        explanation_cache.set(cache_key, explanation_model.model_dump())
        logger.info(f"Successfully prefetched and cached: {url}")
    except Exception as e:
        logger.error(f"Failed to prefetch {url}: {e}")

@router.post("/prefetch")
async def prefetch(request_body: PrefetchRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(prefetch_and_cache, request_body.url)
    return {"message": "URL accepted for prefetching."}

@router.post("/process")
async def process_runtime(request: Request):
    try:
        body = await request.json()
        raw_dom = body.get("dom_data")
        raw_profile = body.get("profile")
        logs = body.get("logs", [])
        is_explicit = body.get("is_explicit", False)

        if not raw_dom or not raw_profile:
            return Response(content=json.dumps({"error": "Missing dom_data or profile"}), status_code=422, media_type="application/json")

        dom_data = DOMData(**raw_dom)
        user_profile = UserProfile(**raw_profile)

        start_time = time.perf_counter()
        result = await runtime.process_page(
            dom_data=dom_data,
            user_profile=user_profile,
            interaction_logs=logs,
            is_explicit=is_explicit
        )
        duration = time.perf_counter() - start_time
        logger.info(f"Performance: Profile={user_profile.aura_id} | Latency={duration:.4f}s")

        return result
    except Exception as e:
        logger.exception(f"Error in /process: {e}")
        return Response(content=json.dumps({"error": str(e)}), status_code=500, media_type="application/json")

@router.post("/chat")
async def chat(request: Request):
    try:
        body = await request.json()
        query = body.get("query")
        if not query:
            return Response(content=json.dumps({"error": "Missing query"}), status_code=422, media_type="application/json")
        response = await agent.execute(query)
        return {"response": response}
    except Exception as e:
        logger.exception(f"Error in /chat: {e}")
        return Response(content=json.dumps({"error": str(e)}), status_code=500, media_type="application/json")

@router.post("/explain")
async def explain(request: Request, profile: UserProfile | None = None):
    try:
        body = await request.json()
        raw_dom = body.get("dom_data")
        if not raw_dom:
            return Response(content=json.dumps({"error": "Missing dom_data"}), status_code=422, media_type="application/json")

        user_profile = profile or (UserProfile(**body.get("profile")) if body.get("profile") else None)
        dom_data = DOMData(**raw_dom)
        distilled = DOMDistiller.distill(dom_data)

        cache_key = get_cache_key(distilled, user_profile)
        cached_explanation = explanation_cache.get(cache_key)

        if cached_explanation:
            return {
                "explanation": ExplanationResponse(**cached_explanation),
                "distilled": distilled,
                "cached": True,
            }

        explanation_model = await explainer.explain_page(distilled, user_profile)
        explanation_cache.set(cache_key, explanation_model.model_dump())

        return {
            "explanation": explanation_model,
            "distilled": distilled,
            "cached": False,
        }
    except Exception as e:
        logger.exception(f"Error in /explain: {e}")
        return Response(content=json.dumps({"error": str(e)}), status_code=500, media_type="application/json")

@router.post("/explain/stream")
async def explain_stream(request: Request, profile: UserProfile | None = None):
    try:
        body = await request.json()
        raw_dom = body.get("dom_data")
        if not raw_dom:
            return Response(content=json.dumps({"error": "Missing dom_data"}), status_code=422, media_type="application/json")

        user_profile = profile or (UserProfile(**body.get("profile")) if body.get("profile") else None)
        dom_data = DOMData(**raw_dom)
        distilled = DOMDistiller.distill(dom_data)
        cache_key = get_cache_key(distilled, user_profile)
        cached_explanation = explanation_cache.get(cache_key)

        async def event_generator() -> AsyncGenerator[str, None]:
            try:
                # We bypass cache for real-time streaming to ensure progressive experience
                # but we can check if it exists to stream it quickly.
                if cached_explanation and isinstance(cached_explanation, dict):
                    logger.info(f"Streaming cached explanation for URL: {dom_data.url}")
                    if cached_explanation.get("summary"):
                        yield f"data: {json.dumps({'type': 'summary', 'content': cached_explanation['summary']})}\n\n"
                    if cached_explanation.get("actions"):
                        for action_text in cached_explanation["actions"]:
                            yield f"data: {json.dumps({'type': 'action', 'content': action_text})}\n\n"
                    return

                full_response_for_cache = {"summary": "", "actions": []}
                async for json_chunk_str in explainer.stream_explanation(distilled, user_profile):
                    yield f"data: {json_chunk_str}\n\n"
                    try:
                        chunk_data = json.loads(json_chunk_str)
                        if chunk_data.get("type") == "summary":
                            full_response_for_cache["summary"] += chunk_data.get("content", "")
                        elif chunk_data.get("type") == "action":
                            # For token-by-token, we might get multiple fragments
                            # A real implementation would buffer or append
                            pass
                    except Exception:
                        pass
                
                # Cache final result (simplified)
                # ...
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        logger.exception(f"Error in /explain/stream: {e}")
        return Response(content=json.dumps({"error": str(e)}), status_code=500, media_type="application/json")

@router.post("/action", response_model=ActionResponse)
async def action(request_body: ActionRequest):
    dom_data = DOMData(**request_body.dom_data) if isinstance(request_body.dom_data, dict) else request_body.dom_data
    distilled = DOMDistiller.distill(dom_data)
    return await explainer.find_action(distilled, request_body.query)

@router.post("/tts")

async def text_to_speech(request_body: TTSRequest):

    try:

        audio_bytes = tts_synthesizer.synthesize_speech(request_body.text)

        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:

        logger.error(f"TTS error: {e}")

        return Response(content=json.dumps({"error": f"TTS Error: {e}"}), status_code=500, media_type="application/json")



@router.post("/verify")

async def verify_adaptation(request_body: VerificationRequest):

    """Visually verifies the adaptation using Vision Judge."""

    try:

        # Prepare multimodal input for pydantic-ai

        # Note: In real production, we'd handle base64 -> image bytes conversion here

        # For now, we pass the context to the agent.

        context = f"URL: {request_body.url}\nGoal: {request_body.goal}\nActions Applied: {request_body.actions_applied}"

        

        # We simulate multimodal input by letting the agent know there's a screenshot.

        # Real integration would use pydantic_ai's multimodal capabilities if supported by the provider.

        result = await vision_judge_agent.run(

            f"Please analyze this UI adaptation.\n{context}",

            # In a real setup, we'd pass the image here as well.

        )

        return result.data

    except Exception as e:

        logger.error(f"Verification error: {e}")

        return {"success": False, "recommendation": "keep", "explanation": f"Verification failed: {str(e)}"}
