// api.ts
// Client-side API functions to fetch market trends from the FastAPI backend.
import { getAuthToken } from "./auth";

export interface ProductMatch {
  source: "openfoodfacts" | "usda_fdc";
  source_id: string;
  name: string;
  brand?: string;
  category?: string;
  ingredients_text?: string;
  nutrients?: Record<string, any>;
  image_url?: string;
  matched_query: string;
  match_score: number;
}

export interface ExtractedClaim {
  product_source_id: string;
  claim_text: string;
  claim_type: string;
  confidence: number;
  evidence_snippet?: string;
}

export interface IngredientInsight {
  product_source_id: string;
  ingredient_name: string;
  is_active_ingredient: boolean;
  category?: string;
  amount_per_serving?: string;
}

export interface RevenueAttribution {
  product_source_id: string;
  estimated_revenue_usd: number;
  revenue_period: string;
  confidence: number;
  methodology: string;
}

export interface MarketTrendsResponse {
  query: string;
  intent: string;
  products: ProductMatch[];
  claims: ExtractedClaim[];
  ingredients: IngredientInsight[];
  revenue: RevenueAttribution[];
  job_ids: string[];
}

// Use relative URLs in production when VITE_API_BASE_URL is not set
// This works because vercel.json proxies /api/* to the Railway backend
const getBackendUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8000";
  }
  // In production without explicit backend URL, use relative path for Vercel proxy
  return "";
};

const BACKEND_URL = getBackendUrl();

// ---------------------------------------------------------------------------
// Demo fallback data — used when backend is unreachable (e.g. Vercel deploy
// without a deployed backend). Replace with a real backend URL via
// VITE_API_BASE_URL to show live data.
// ---------------------------------------------------------------------------
function getDemoData(query: string): MarketTrendsResponse {
  return {
    query,
    intent: "market_trends",
    job_ids: ["demo-mode"],
    products: [
      { source: "openfoodfacts", source_id: "demo-1", name: "Elderberry + Vitamin C Gummies", brand: "Nature's Bounty", category: "Immune Support", ingredients_text: "Elderberry extract, Vitamin C 250mg, Zinc 5mg, Echinacea", matched_query: query, match_score: 0.95 },
      { source: "usda_fdc", source_id: "demo-2", name: "Zinc Citrate 50mg Capsules", brand: "Solgar", category: "Minerals", ingredients_text: "Zinc Citrate, Vitamin C, Magnesium Stearate", matched_query: query, match_score: 0.88 },
      { source: "openfoodfacts", source_id: "demo-3", name: "Vitamin D3 + K2 Drops", brand: "Thorne", category: "Vitamins", ingredients_text: "Vitamin D3 2000IU, Vitamin K2 MK-7, MCT Oil", matched_query: query, match_score: 0.82 },
      { source: "usda_fdc", source_id: "demo-4", name: "Echinacea Immune Blend", brand: "Gaia Herbs", category: "Botanicals", ingredients_text: "Echinacea purpurea, Elderberry, Astragalus Root", matched_query: query, match_score: 0.79 },
      { source: "openfoodfacts", source_id: "demo-5", name: "Immune Defense Multivitamin", brand: "Garden of Life", category: "Multivitamins", ingredients_text: "Vitamin C, Vitamin D, Zinc, Selenium, Elderberry", matched_query: query, match_score: 0.75 },
      { source: "usda_fdc", source_id: "demo-6", name: "Quercetin + Bromelain 500mg", brand: "NOW Foods", category: "Immune Support", ingredients_text: "Quercetin Dihydrate, Bromelain, Vitamin C, Zinc", matched_query: query, match_score: 0.71 },
      { source: "openfoodfacts", source_id: "demo-7", name: "Liposomal Vitamin C 1000mg", brand: "Quicksilver Scientific", category: "Vitamins", ingredients_text: "Ascorbic Acid, Phosphatidylcholine, Sunflower Lecithin", matched_query: query, match_score: 0.68 },
      { source: "usda_fdc", source_id: "demo-8", name: "Colloidal Silver Immune Spray", brand: "Sovereign Silver", category: "Immune Support", ingredients_text: "Colloidal Silver 10ppm, Purified Water", matched_query: query, match_score: 0.62 },
    ],
    claims: [
      { product_source_id: "demo-1", claim_text: "Supports immune system health", claim_type: "immune_support", confidence: 0.92, evidence_snippet: "elderberry extract vitamin c zinc" },
      { product_source_id: "demo-1", claim_text: "Contains/associated with: elderberry", claim_type: "immune_support", confidence: 0.88, evidence_snippet: "elderberry extract" },
      { product_source_id: "demo-2", claim_text: "Essential mineral for immune function", claim_type: "immune_support", confidence: 0.85, evidence_snippet: "zinc citrate 50mg" },
      { product_source_id: "demo-3", claim_text: "Supports bone and immune health", claim_type: "immune_support", confidence: 0.80, evidence_snippet: "vitamin d3 2000iu" },
      { product_source_id: "demo-4", claim_text: "Traditional immune botanical formula", claim_type: "immune_support", confidence: 0.78, evidence_snippet: "echinacea purpurea elderberry" },
      { product_source_id: "demo-5", claim_text: "Comprehensive immune defense formula", claim_type: "immune_support", confidence: 0.75, evidence_snippet: "vitamin c vitamin d zinc selenium elderberry" },
      { product_source_id: "demo-6", claim_text: "Antioxidant immune support complex", claim_type: "immune_support", confidence: 0.70, evidence_snippet: "quercetin bromelain vitamin c" },
    ],
    ingredients: [
      { product_source_id: "demo-1", ingredient_name: "Elderberry Extract", is_active_ingredient: true, category: "Botanical", amount_per_serving: "200mg" },
      { product_source_id: "demo-1", ingredient_name: "Vitamin C", is_active_ingredient: true, category: "Vitamin", amount_per_serving: "250mg" },
      { product_source_id: "demo-1", ingredient_name: "Zinc", is_active_ingredient: true, category: "Mineral", amount_per_serving: "5mg" },
      { product_source_id: "demo-2", ingredient_name: "Zinc Citrate", is_active_ingredient: true, category: "Mineral", amount_per_serving: "50mg" },
      { product_source_id: "demo-3", ingredient_name: "Vitamin D3", is_active_ingredient: true, category: "Vitamin", amount_per_serving: "2000IU" },
      { product_source_id: "demo-3", ingredient_name: "Vitamin K2 MK-7", is_active_ingredient: true, category: "Vitamin", amount_per_serving: "90mcg" },
      { product_source_id: "demo-4", ingredient_name: "Echinacea Purpurea", is_active_ingredient: true, category: "Botanical", amount_per_serving: "300mg" },
      { product_source_id: "demo-6", ingredient_name: "Quercetin Dihydrate", is_active_ingredient: true, category: "Flavonoid", amount_per_serving: "500mg" },
    ],
    revenue: [
      { product_source_id: "demo-1", estimated_revenue_usd: 9500, revenue_period: "latest", confidence: 0.1, methodology: "demo_placeholder" },
      { product_source_id: "demo-2", estimated_revenue_usd: 8800, revenue_period: "latest", confidence: 0.1, methodology: "demo_placeholder" },
      { product_source_id: "demo-3", estimated_revenue_usd: 8200, revenue_period: "latest", confidence: 0.1, methodology: "demo_placeholder" },
      { product_source_id: "demo-4", estimated_revenue_usd: 7900, revenue_period: "latest", confidence: 0.1, methodology: "demo_placeholder" },
      { product_source_id: "demo-5", estimated_revenue_usd: 7500, revenue_period: "latest", confidence: 0.1, methodology: "demo_placeholder" },
    ],
  };
}

export async function fetchMarketTrends(query: string, limit = 25): Promise<MarketTrendsResponse> {
  // In production without explicit backend URL, use relative path for Vercel proxy
  const apiBase = BACKEND_URL || "";
  const useRelative = !BACKEND_URL && !import.meta.env.DEV;
  const endpoint = useRelative ? "/api/trends" : `${apiBase}/api/trends`;

  // If no backend available in production and no proxy configured, return demo data
  if (!apiBase && !useRelative) {
    console.warn("[api] No backend URL configured — returning demo data.");
    return getDemoData(query);
  }

  const token = getAuthToken();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (err: any) {
    // Network error or backend unavailable — fall back to demo data
    console.warn("[api] Backend unreachable, using demo data:", err.message);
    return getDemoData(query);
  }
}

export async function sendAssistantChat(message: string): Promise<{
  reply: string;
  products_count: number;
  claims_count: number;
  ingredients_count: number;
  chart_data: { category: string; value: number }[];
  products: ProductMatch[];
}> {
  // In production without explicit backend URL, use relative path for Vercel proxy
  const apiBase = BACKEND_URL || "";
  const useRelative = !BACKEND_URL && !import.meta.env.DEV;
  const endpoint = useRelative ? "/api/assistant/chat" : `${apiBase}/api/assistant/chat`;

  if (!apiBase && !useRelative) {
    return {
      reply: `**Demo Mode** — No backend is connected.\n\nIn a live environment, this would query the AI agent pipeline for: *"${message}"*\n\nTo connect a real backend, deploy the FastAPI service and set the \`VITE_API_BASE_URL\` environment variable on Vercel.`,
      products_count: 8,
      claims_count: 7,
      ingredients_count: 8,
      chart_data: [
        { category: "Immune Support", value: 4 },
        { category: "Vitamins", value: 2 },
        { category: "Botanicals", value: 1 },
        { category: "Minerals", value: 1 },
      ],
      products: getDemoData(message).products,
    };
  }

  const token = getAuthToken();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API error ${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (err: any) {
    console.warn("[api] Assistant backend unreachable:", err.message);
    return {
      reply: `**Demo Mode** — Backend is currently unreachable.\n\nIn a live environment, this would return AI-powered market intelligence for: *"${message}"*`,
      products_count: 0,
      claims_count: 0,
      ingredients_count: 0,
      chart_data: [],
      products: [],
    };
  }
}
