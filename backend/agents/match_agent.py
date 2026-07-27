"""
match_agent.py
Finds candidate SKUs for a given market query (e.g. "Immune Support") by
querying both Open Food Facts and USDA FDC (Branded Foods dataset covers
supplements/functional foods well) in parallel, then scoring relevance.
"""
from __future__ import annotations
import asyncio
from typing import Any

from services import openfoodfacts_client as off
from services import usda_fdc_client as fdc

# Cheap heuristic keyword expansion so a market name like "Immune Support"
# also catches products tagged/described with related terms. Swap this for
# an embeddings-based expansion or LLM call if you need better recall.
_MARKET_SYNONYMS = {
    "immune support": [
        "immune support", "immunity", "vitamin c", "zinc", "elderberry",
        "echinacea", "vitamin d immune",
    ],
}


def _expand_query(query: str) -> list[str]:
    key = query.strip().lower()
    return _MARKET_SYNONYMS.get(key, [query])


def _score(name: str, ingredients_text: str | None, query_terms: list[str]) -> float:
    haystack = f"{name} {ingredients_text or ''}".lower()
    hits = sum(1 for term in query_terms if term.lower() in haystack)
    return round(hits / max(len(query_terms), 1), 3)


async def run(query: str, limit: int = 100) -> list[dict[str, Any]]:
    """
    Returns a de-duplicated, relevance-scored list of ProductMatch dicts
    from both sources.
    """
    terms = _expand_query(query)

    off_results, fdc_results = await asyncio.gather(
        _search_off(terms, limit),
        _search_fdc(terms, limit),
        return_exceptions=True,
    )

    products: list[dict[str, Any]] = []
    if isinstance(off_results, list):
        products.extend(off_results)
    if isinstance(fdc_results, list):
        products.extend(fdc_results)

    for p in products:
        p["match_score"] = _score(p["name"], p.get("ingredients_text"), terms)

    products.sort(key=lambda p: p["match_score"], reverse=True)

    # de-dupe by (source, source_id)
    seen = set()
    deduped = []
    for p in products:
        key = (p["source"], p["source_id"])
        if key not in seen:
            seen.add(key)
            deduped.append(p)

    return deduped[:limit]


async def _search_off(terms: list[str], limit: int) -> list[dict[str, Any]]:
    primary = terms[0]
    raw = await off.search_products(primary, page_size=limit)
    return [off.normalize_product(r, primary) for r in raw]


async def _search_fdc(terms: list[str], limit: int) -> list[dict[str, Any]]:
    primary = terms[0]
    raw = await fdc.search_foods(
        primary, data_types=["Branded", "Foundation"], page_size=limit
    )
    return [fdc.normalize_food(r, primary) for r in raw]
