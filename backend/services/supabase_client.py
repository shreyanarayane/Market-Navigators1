"""
supabase_client.py
Single point of contact with Supabase ("source of truth" DB in the architecture diagram).
Uses direct PostgREST HTTP calls via httpx for 100% compatibility with all key formats
(including new `sb_secret_...` and `sb_publishable_...` tokens, as well as legacy `eyJ...` JWTs).
"""
from __future__ import annotations
import logging
from typing import Any
import httpx

from config import get_settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    s = get_settings()
    return bool(s.SUPABASE_URL and s.SUPABASE_SERVICE_KEY)


def get_client():
    """Returns self if configured for backward compatibility."""
    return True if is_configured() else None


def _get_headers(prefer_upsert: bool = False, on_conflict: str | None = None) -> dict[str, str]:
    s = get_settings()
    headers = {
        "apikey": s.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {s.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer_upsert:
        pref = "resolution=merge-duplicates"
        if on_conflict:
            pref += f",on_conflict={on_conflict}"
        headers["Prefer"] = pref
    return headers


# ---------------------------------------------------------------------------
# Writers - one per agent's output table. See db/schema.sql for DDL.
# ---------------------------------------------------------------------------

def upsert_products(job_id: str, products: list[dict[str, Any]]) -> None:
    if not is_configured() or not products:
        return
    s = get_settings()
    url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/products?on_conflict=source,source_id"
    rows = [{**p, "job_id": job_id} for p in products]
    try:
        res = httpx.post(url, headers=_get_headers(prefer_upsert=True), json=rows, timeout=10.0)
        if res.status_code not in (200, 201):
            logger.warning(f"Supabase upsert_products error {res.status_code}: {res.text}")
    except Exception as exc:
        logger.error(f"Supabase upsert_products exception: {exc}")


def insert_claims(job_id: str, claims: list[dict[str, Any]]) -> None:
    if not is_configured() or not claims:
        return
    s = get_settings()
    url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/claims"
    rows = [{**c, "job_id": job_id} for c in claims]
    try:
        res = httpx.post(url, headers=_get_headers(), json=rows, timeout=10.0)
        if res.status_code not in (200, 201):
            logger.warning(f"Supabase insert_claims error {res.status_code}: {res.text}")
    except Exception as exc:
        logger.error(f"Supabase insert_claims exception: {exc}")


def insert_ingredients(job_id: str, ingredients: list[dict[str, Any]]) -> None:
    if not is_configured() or not ingredients:
        return
    s = get_settings()
    url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/ingredients"
    rows = [{**i, "job_id": job_id} for i in ingredients]
    try:
        res = httpx.post(url, headers=_get_headers(), json=rows, timeout=10.0)
        if res.status_code not in (200, 201):
            logger.warning(f"Supabase insert_ingredients error {res.status_code}: {res.text}")
    except Exception as exc:
        logger.error(f"Supabase insert_ingredients exception: {exc}")


def insert_revenue(job_id: str, revenue: list[dict[str, Any]]) -> None:
    if not is_configured() or not revenue:
        return
    s = get_settings()
    url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/revenue_attribution"
    rows = [{**r, "job_id": job_id} for r in revenue]
    try:
        res = httpx.post(url, headers=_get_headers(), json=rows, timeout=10.0)
        if res.status_code not in (200, 201):
            logger.warning(f"Supabase insert_revenue error {res.status_code}: {res.text}")
    except Exception as exc:
        logger.error(f"Supabase insert_revenue exception: {exc}")


def set_job_status(job_id: str, agent: str, status: str, error: str | None = None) -> None:
    if not is_configured():
        return
    s = get_settings()
    url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/jobs?on_conflict=job_id,agent"
    payload = [{"job_id": job_id, "agent": agent, "status": status, "error": error}]
    try:
        res = httpx.post(url, headers=_get_headers(prefer_upsert=True), json=payload, timeout=10.0)
        if res.status_code not in (200, 201):
            logger.warning(f"Supabase set_job_status error {res.status_code}: {res.text}")
    except Exception as exc:
        logger.error(f"Supabase set_job_status exception: {exc}")


def save_all_results(job_id: str, products: list[dict[str, Any]], claims: list[dict[str, Any]], ingredients: list[dict[str, Any]], revenue: list[dict[str, Any]]) -> None:
    """Helper to persist all agent pipeline results to Supabase in one call."""
    print(f"[Supabase] save_all_results called - job_id: {job_id}")
    print(f"[Supabase] Products: {len(products)}, Claims: {len(claims)}, Ingredients: {len(ingredients)}, Revenue: {len(revenue)}")
    
    if not is_configured():
        print("[Supabase] NOT CONFIGURED - skipping save. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")
        return
    try:
        print(f"[Supabase] Saving {len(products)} products, {len(claims)} claims, {len(ingredients)} ingredients, {len(revenue)} revenue...")
        if products:
            upsert_products(job_id, products)
        if claims:
            insert_claims(job_id, claims)
        if ingredients:
            insert_ingredients(job_id, ingredients)
        if revenue:
            insert_revenue(job_id, revenue)
        set_job_status(job_id, "orchestrator", "success")
        print(f"[Supabase] Successfully saved all results for job_id: {job_id}")
    except Exception as exc:
        print(f"[Supabase] ERROR saving results: {exc}")
        set_job_status(job_id, "orchestrator", "failed", error=str(exc))


# ---------------------------------------------------------------------------
# Readers - used by the orchestrator to aggregate once all agents finish.
# ---------------------------------------------------------------------------

def get_job_results(job_id: str) -> dict[str, list[dict[str, Any]]]:
    if not is_configured():
        return {"products": [], "claims": [], "ingredients": [], "revenue": []}

    s = get_settings()
    headers = _get_headers()

    results = {"products": [], "claims": [], "ingredients": [], "revenue": []}
    tables = {
        "products": "products",
        "claims": "claims",
        "ingredients": "ingredients",
        "revenue": "revenue_attribution",
    }

    try:
        for key, table in tables.items():
            url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/{table}?job_id=eq.{job_id}"
            res = httpx.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                results[key] = res.json()
    except Exception as exc:
        logger.error(f"Supabase get_job_results exception: {exc}")

    return results


def get_job_statuses(job_ids: list[str]) -> list[dict[str, Any]]:
    if not is_configured() or not job_ids:
        return []
    s = get_settings()
    headers = _get_headers()
    try:
        ids_str = ",".join(job_ids)
        url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/jobs?job_id=in.({ids_str})"
        res = httpx.get(url, headers=headers, timeout=10.0)
        if res.status_code == 200:
            return res.json()
    except Exception as exc:
        logger.error(f"Supabase get_job_statuses exception: {exc}")
    return []


def fetch_sku_sales(source_ids: list[str]) -> dict[str, float]:
    if not is_configured() or not source_ids:
        return {}
    s = get_settings()
    headers = _get_headers()
    try:
        ids_str = ",".join(source_ids)
        url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/sku_sales?select=source_id,revenue_usd&source_id=in.({ids_str})"
        res = httpx.get(url, headers=headers, timeout=10.0)
        if res.status_code == 200:
            rows = res.json()
            return {r["source_id"]: float(r["revenue_usd"]) for r in rows if "source_id" in r and "revenue_usd" in r}
    except Exception as exc:
        logger.error(f"Supabase fetch_sku_sales exception: {exc}")
    return {}


def search_products_nlp(query: str, limit: int = 25) -> list[dict[str, Any]]:
    """
    Natural Language search directly across stored Supabase products using text matching
    on product name, brand, category, ingredients_text, and matched_query.
    """
    if not is_configured() or not query.strip():
        return []
    s = get_settings()
    headers = _get_headers()
    q = query.strip()
    try:
        # PostgREST OR filter matching any field containing the natural language query
        filter_str = f"or=(name.ilike.*{q}*,brand.ilike.*{q}*,category.ilike.*{q}*,ingredients_text.ilike.*{q}*,matched_query.ilike.*{q}*)"
        url = f"{s.SUPABASE_URL.rstrip('/')}/rest/v1/products?select=*&{filter_str}&limit={limit}"
        res = httpx.get(url, headers=headers, timeout=10.0)
        if res.status_code == 200:
            return res.json()
    except Exception as exc:
        logger.error(f"Supabase search_products_nlp exception: {exc}")
    return []
