"""
main.py
FastAPI orchestrator. Classifies the user's query, dispatches the agent
pipeline (via Celery in production, or run inline for the demo / when
Redis isn't available), and returns the aggregated result.

Run locally (demo mode, no Redis/Celery needed):
    uvicorn main:app --reload --port 8000

Run with full async pipeline (needs Redis + a Celery worker):
    redis-server &
    celery -A celery_app worker --loglevel=info &
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations
import os
import sys
import uuid
import asyncio

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from config import get_settings
from models.schemas import TrendsRequest, MarketTrendsResponse, JobStatus
from agents import match_agent, claims_agent, ingredient_agent, revenue_agent
from auth.router import router as auth_router, get_current_user, UserInfo
from services import llm_client

settings = get_settings()
print("LOADED CORS ORIGINS:", settings.CORS_ORIGINS)

app = FastAPI(title=settings.APP_NAME)

# ===========================================================================
# 1. ADD CORS MIDDLEWARE FIRST (before any routers)
# ===========================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or settings.CORS_ORIGINS if you have it in config
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================================================
# 2. THEN INCLUDE ROUTERS (so CORS applies to all routes)
# ===========================================================================
app.include_router(auth_router)


# ---------------------------------------------------------------------------
# Intent classification
# ---------------------------------------------------------------------------

async def classify_intent(query: str) -> dict:
    return await llm_client.classify_intent_llm(query)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


from models.schemas import TrendsRequest, MarketTrendsResponse, JobStatus, LLMStatusResponse

@app.get("/api/llm/status", response_model=LLMStatusResponse)
async def llm_status():
    """Returns status and provider details for the configured LLM client."""
    return llm_client.get_llm_status()


# ===============================================================================
# DEBUG ENDPOINTS - Remove in production
# ===============================================================================
@app.get("/api/debug/supabase")
async def debug_supabase():
    """Debug endpoint to check Supabase configuration and test connection."""
    from services import supabase_client
    s = get_settings()
    
    return {
        "supabase_url_set": bool(s.SUPABASE_URL),
        "supabase_url": s.SUPABASE_URL[:20] + "..." if s.SUPABASE_URL else None,
        "service_key_set": bool(s.SUPABASE_SERVICE_KEY),
        "service_key_prefix": s.SUPABASE_SERVICE_KEY[:20] + "..." if s.SUPABASE_SERVICE_KEY else None,
        "is_configured": supabase_client.is_configured(),
    }


@app.post("/api/debug/test-save")
async def debug_test_save():
    """Test endpoint to save sample data to Supabase and verify it works."""
    from services import supabase_client
    
    job_id = str(uuid.uuid4())
    test_products = [{
        "source": "test",
        "source_id": f"test-{job_id[:8]}",
        "name": "Test Product - Immune Support",
        "brand": "Test Brand",
        "category": "Supplements",
        "match_score": 0.95
    }]
    test_claims = [{
        "product_source_id": f"test-{job_id[:8]}",
        "claim_text": "Test claim - immune support",
        "claim_type": "immune_support",
        "confidence": 0.9
    }]
    
    supabase_client.save_all_results(job_id, test_products, test_claims, [], [])
    
    return {
        "message": "Test data saved",
        "job_id": job_id,
        "products_saved": len(test_products),
        "supabase_configured": supabase_client.is_configured()
    }


from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str


@app.post("/api/assistant/chat")
async def assistant_chat(req: ChatRequest, _current_user: UserInfo = Depends(get_current_user)):
    """
    Interactive AI Assistant endpoint. Runs agent pipeline and uses Gemini AI
    to generate natural language answers to user questions.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    query = req.message.strip()
    search_term = llm_client.extract_search_keywords(query)

    try:
        products = await match_agent.run(search_term, limit=10)
        claims, ingredients, revenue = await asyncio.gather(
            claims_agent.run(products),
            ingredient_agent.run(products),
            revenue_agent.run(products),
        )

        job_id = str(uuid.uuid4())
        from services import supabase_client
        supabase_client.save_all_results(job_id, products, claims, ingredients, revenue)

        brands = list(set(p.get("brand") for p in products if p.get("brand")))
        sample_names = [p.get("name") for p in products[:5] if p.get("name")]

        context_str = (
            f"Matched {len(products)} products ({', '.join(sample_names[:3])}). "
            f"Brands: {', '.join(brands[:4])}. "
            f"Extracted Claims: {len(claims)}. Active Ingredients Identified: {len(ingredients)}."
        )

        system_prompt = (
            "You are Compete IQ AI Assistant, an expert market intelligence advisor. "
            "Provide a clear, professional, direct 2-3 paragraph answer to the user's question "
            "using the retrieved market intelligence context. Highlight product trends, top brands, and formulation details."
        )
        prompt = f"User Question: \"{query}\"\nRetrieved Data Context: {context_str}"

        ai_answer = await llm_client.generate_completion(prompt, system_prompt)

        if not ai_answer:
            ai_answer = (
                f"I queried the market intelligence pipeline for **\"{query}\"**. "
                f"I matched **{len(products)} products** across brands like *{', '.join(brands[:3]) or 'various manufacturers'}*. "
                f"The claims agent extracted **{len(claims)} marketing claims**, and the ingredient agent identified **{len(ingredients)} active formulation components**."
            )

        cat_counts: dict[str, int] = {}
        for p in products:
            c = p.get("category") or "General"
            cat_counts[c] = cat_counts.get(c, 0) + 1
        chart_data = [{"category": k, "value": v} for k, v in cat_counts.items()]

        return {
            "reply": ai_answer,
            "products_count": len(products),
            "claims_count": len(claims),
            "ingredients_count": len(ingredients),
            "chart_data": chart_data,
            "products": products
        }
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/trends", response_model=MarketTrendsResponse)
async def get_market_trends(req: TrendsRequest, _current_user: UserInfo = Depends(get_current_user)):
    """
    Orchestrator endpoint mirroring the architecture diagram: classify
    intent, fan out to the agents, aggregate, and return one unified response.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    intent_result = await classify_intent(req.query)
    job_id = str(uuid.uuid4())

    try:
        products = await match_agent.run(req.query, limit=req.limit)

        claims, ingredients, revenue = await asyncio.gather(
            claims_agent.run(products),
            ingredient_agent.run(products),
            revenue_agent.run(products),
        )

        # Persist to Supabase if configured (no-ops gracefully if SUPABASE_URL is empty)
        from services import supabase_client
        supabase_client.save_all_results(job_id, products, claims, ingredients, revenue)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"upstream data source error: {exc}") from exc

    return MarketTrendsResponse(
        query=req.query,
        intent=intent_result["intent"],
        products=products,
        claims=claims,
        ingredients=ingredients,
        revenue=revenue,
        job_ids=[job_id],
    )


@app.post("/api/trends/async")
async def get_market_trends_async(req: TrendsRequest, _current_user: UserInfo = Depends(get_current_user)):
    """
    Production-shaped version: dispatches the Celery pipeline and returns
    immediately with a job_id the frontend can poll. Requires Redis and
    at least one Celery worker running (see module docstring).
    """
    from tasks.jobs import dispatch_pipeline

    job_id = str(uuid.uuid4())
    dispatch_pipeline(job_id, req.query, req.limit)
    return {"job_id": job_id, "status": "dispatched"}


@app.get("/api/jobs/{job_id}", response_model=MarketTrendsResponse)
async def get_job_result(job_id: str, _current_user: UserInfo = Depends(get_current_user)):
    """Poll for aggregated results once the async pipeline has run."""
    from services import supabase_client

    data = supabase_client.get_job_results(job_id)
    return MarketTrendsResponse(
        query="",
        intent="market_trends",
        products=data["products"],
        claims=data["claims"],
        ingredients=data["ingredients"],
        revenue=data["revenue"],
        job_ids=[job_id],
    )


# ---------------------------------------------------------------------------
# Auth is now fully wired up.
# ---------------------------------------------------------------------------
# The auth router is mounted at startup (see above).
# Protected routes use Depends(get_current_user) to enforce authentication.
# Only these two users can log in:
#   - shreya.narayae1@gmail.com   (password: 12345)
#   - shamarthi.sathish111@gmail.com (password: 12345)
# See backend/auth/router.py to add more users or change passwords.