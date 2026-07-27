"""
schemas.py
Shared Pydantic models. Agents produce these; the orchestrator aggregates
them; the API serializes them straight to the frontend.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class ProductMatch(BaseModel):
    source: Literal["openfoodfacts", "usda_fdc"]
    source_id: str                     # barcode / fdcId
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    ingredients_text: Optional[str] = None
    nutrients: dict = Field(default_factory=dict)
    image_url: Optional[str] = None
    matched_query: str
    match_score: float = 0.0


class ExtractedClaim(BaseModel):
    product_source_id: str
    claim_text: str
    claim_type: Literal[
        "immune_support", "energy", "digestive", "beauty", "sleep", "other"
    ] = "other"
    confidence: float = 0.0
    evidence_snippet: Optional[str] = None


class IngredientInsight(BaseModel):
    product_source_id: str
    ingredient_name: str
    is_active_ingredient: bool = False
    category: Optional[str] = None       # e.g. vitamin, mineral, botanical
    amount_per_serving: Optional[str] = None


class RevenueAttribution(BaseModel):
    product_source_id: str
    estimated_revenue_usd: float
    revenue_period: str                  # e.g. "2026-Q2"
    confidence: float = 0.0
    methodology: str = "category_share_estimate"


class JobStatus(BaseModel):
    job_id: str
    agent: str
    status: Literal["pending", "running", "success", "failed"]
    error: Optional[str] = None
    updated_at: Optional[datetime] = None


class LLMStatusResponse(BaseModel):
    configured: bool
    provider: str
    has_openai: bool
    has_anthropic: bool
    has_gemini: bool


class MarketTrendsResponse(BaseModel):
    query: str
    intent: str
    products: list[ProductMatch] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
    ingredients: list[IngredientInsight] = Field(default_factory=list)
    revenue: list[RevenueAttribution] = Field(default_factory=list)
    job_ids: list[str] = Field(default_factory=list)


class TrendsRequest(BaseModel):
    query: str = Field(..., examples=["immune support market trends"])
    category_hint: Optional[str] = None
    limit: int = 100
