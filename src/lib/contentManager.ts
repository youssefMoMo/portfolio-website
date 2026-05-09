// ═══════════════════════════════════════════════════════════════
// CONTENT MANAGER — Supabase-First + LocalStorage fallback
// src/lib/contentManager.ts
// ═══════════════════════════════════════════════════════════════

import { supabase, isSupabaseEnabled } from "./supabase";
import {
  reviewsData,
  pricingPlans,
  policies as defaultPoliciesData,
  portfolioItems as defaultPortfolioItems,
} from "./data";

const CONTENT_PREFIX = "admin_";
const OLD_SUPABASE_URL = "lshrxznzibzvvulphtrr.supabase.co";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface HomeContent {
  hero_badge: string; hero_title1: string; hero_title2: string; hero_subtitle: string;
  stats_projects: string; stats_clients: string; stats_rating: string; stats_years: string;
  cta_title: string; cta_subtitle: string;
}
export interface PortfolioItem {
  id: number | string; title: string; image: string; category: string;
  display_order?: number; is_published?: boolean;
}
export interface PortfolioContent { items: PortfolioItem[]; }
export interface PricingPlan {
  id: number | string; name: string; price_usd: string; price_robux: string;
  frames: string; features?: string[]; featured?: boolean; icon?: string;
  display_order?: number; is_published?: boolean;
}
export interface PricingContent { plans: PricingPlan[]; }
export interface Review {
  id: number | string; name: string; rating: number; text: string;
  project_type: string; date: string; verified: boolean;
  avatar?: string; created_at?: string; updated_at?: string;
}
export interface ReviewsContent {
  reviews: Review[]; page_title?: string; page_description?: string;
}
export interface Policy {
  id: number | string; title: string; description: string; icon: string;
  display_order?: number; is_published?: boolean; created_at?: string; updated_at?: string;
}
export interface PoliciesContent {
  policies: Policy[]; page_title?: string; page_description?: string;
}

// ── Error Log ──────────────────────────────────────────────────
export interface ErrorLog {
  id: string;
  type: "error" | "warning" | "network" | "unhandled";
  page: string;
  message: string;
  stack?: string;
  timestamp: string;
  userAgent?: string;
}

const ERROR_LOGS_KEY = "yd_error_logs";
const MAX_LOGS = 100;

export function addErrorLog(log: Omit<ErrorLog, "id" | "timestamp">): void {
  try {
    const existing = getErrorLogs();
    const newLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log,
    };
    const updated = [newLog, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(ERROR_LOGS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function getErrorLogs(): ErrorLog[] {
  try {
    const raw = localStorage.getItem(ERROR_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ErrorLog[];
  } catch { return []; }
}

export function clearErrorLogs(): void {
  localStorage.removeItem(ERROR_LOGS_KEY);
}

export type ContentType = "home" | "portfolio" | "pricing" | "reviews" | "policies";

export type ContentByType<T extends ContentType> = T extends "home"
  ? HomeContent : T extends "portfolio" ? PortfolioContent
  : T extends "pricing" ? PricingContent
  : T extends "reviews" ? ReviewsContent
  : T extends "policies" ? PoliciesContent : never;

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTENT
// ═══════════════════════════════════════════════════════════════

export const defaultContent = {
  home: {
    hero_badge: "Available for Projects", hero_title1: "Crafting Immersive",
    hero_title2: "User Interfaces",
    hero_subtitle: "Crafting immersive and high-quality user interfaces for your Roblox experiences.",
    stats_projects: "160+", stats_clients: "70+", stats_rating: "4.9", stats_years: "4+",
    cta_title: "Ready to Transform Your Game?",
    cta_subtitle: "Elevate your Roblox experience with premium, professional UI design that players love.",
  } as HomeContent,
  portfolio: {
    items: defaultPortfolioItems.map((item, i) => ({ ...item, display_order: i, is_published: true })),
  } as PortfolioContent,
  pricing: {
    plans: pricingPlans.map((plan, i) => ({ ...plan, display_order: i, is_published: true })),
  } as PricingContent,
  reviews: {
    reviews: reviewsData.map((r) => ({ ...r })),
    page_title: "Customer Reviews",
    page_description: "See what my clients say about working with me",
  } as ReviewsContent,
  policies: {
    policies: defaultPoliciesData.map((p, i) => ({ ...p, display_order: i, is_published: true })),
    page_title: "Policies & Terms",
    page_description: "Understand my working policies and terms",
  } as PoliciesContent,
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS — dedicated table (allows anonymous inserts)
// ═══════════════════════════════════════════════════════════════

/**
 * Submit a review to the dedicated `reviews` table.
 * This table has a public INSERT policy so ANY visitor can submit.
 */
export async function submitReviewToTable(
  review: Omit<Review, "id" | "created_at" | "updated_at">
): Promise<boolean> {
  const newReview: Review = {
    id: crypto.randomUUID(),
    name: review.name,
    rating: review.rating,
    text: review.text,
    project_type: review.project_type || "UI Design",
    date: review.date || new Date().toISOString().split("T")[0],
    verified: review.verified ?? true,
    avatar: review.avatar || review.name.charAt(0).toUpperCase(),
  };

  // Method 1: Try dedicated reviews table
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from("reviews").insert({
        name: newReview.name,
        rating: newReview.rating,
        text: newReview.text,
        project_type: newReview.project_type,
        date: newReview.date,
        verified: true,
        avatar: newReview.avatar,
      });
      if (!error) return true;
      // Table doesn't exist or RLS blocked — fall through to method 2
    } catch { /* fall through */ }
  }

  // Method 2: Save to site_content (reviews blob)
  try {
    const existing = await getAllReviews();
    const merged: ReviewsContent = {
      reviews: [newReview, ...existing],
    };

    // Try Supabase site_content
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from("site_content").upsert(
          {
            content_type: "reviews",
            content_key: "data",
            content_value: merged,
            is_published: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "content_type,content_key" }
        );
        if (!error) {
          localStorage.setItem("admin_reviews_content", JSON.stringify(merged));
          return true;
        }
      } catch { /* fall through */ }
    }

    // Method 3: localStorage only (last resort)
    localStorage.setItem("admin_reviews_content", JSON.stringify(merged));
    addErrorLog({ type: "warning", page: "/reviews", message: "Review saved to localStorage only — Supabase tables not available. Run supabase-setup.sql + reviews-table.sql" });
    return true;
  } catch (e: any) {
    addErrorLog({ type: "error", page: "/reviews", message: `submitReview failed: ${e?.message}` });
    return false;
  }
}

/**
 * Get ALL reviews: base defaults + Supabase table + site_content.
 * Deduplicates by id+name so no review shows twice.
 */
export async function getAllReviews(): Promise<Review[]> {
  // Layer 1: defaults from data.ts
  const base: Review[] = reviewsData.map((r) => ({ ...r }));

  // Layer 2: reviews from Supabase dedicated table
  let tableReviews: Review[] = [];
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        tableReviews = data.map((r: any) => ({
          id: r.id, name: r.name, rating: r.rating, text: r.text,
          project_type: r.project_type || "UI Design",
          date: r.date || r.created_at?.split("T")[0] || "",
          verified: r.verified ?? true,
          avatar: r.avatar || r.name?.charAt(0)?.toUpperCase(),
          created_at: r.created_at,
        }));
      }
    } catch { /* ignore */ }
  }

  // Layer 3: reviews from site_content (Supabase or localStorage)
  let contentReviews: Review[] = [];
  try {
    if (isSupabaseEnabled && supabase) {
      const { data } = await supabase
        .from("site_content")
        .select("content_value")
        .eq("content_type", "reviews")
        .eq("content_key", "data")
        .eq("is_published", true)
        .maybeSingle();
      if (data?.content_value?.reviews) {
        contentReviews = data.content_value.reviews;
      }
    }
  } catch { /* ignore */ }

  // Layer 4: localStorage fallback
  let localReviews: Review[] = [];
  try {
    const raw = localStorage.getItem("admin_reviews_content");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.reviews) localReviews = parsed.reviews;
    }
  } catch { /* ignore */ }

  // Merge + deduplicate by name+text (more reliable than UUID)
  const seen = new Set<string>();
  const merged: Review[] = [];
  for (const r of [...tableReviews, ...contentReviews, ...localReviews, ...base]) {
    const key = `${r.name}::${r.text}`.toLowerCase();
    if (!seen.has(key)) { seen.add(key); merged.push(r); }
  }

  return merged;
}

/**
 * Delete a review from the dedicated table (admin only).
 */
export async function deleteReviewFromTable(id: string): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;
  try {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    return !error;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO IMAGES FIX
// ═══════════════════════════════════════════════════════════════

function fixPortfolioImages(content: PortfolioContent): PortfolioContent {
  return {
    ...content,
    items: content.items.map((item, i) => ({
      ...item,
      image: item.image.includes(OLD_SUPABASE_URL)
        ? `/images/portfolio/work${(i % 22) + 1}.png`
        : item.image,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE SITE_CONTENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getContentFromSupabase<T extends ContentType>(
  type: T
): Promise<ContentByType<T> | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("content_value")
      .eq("content_type", type)
      .eq("content_key", "data")
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) return null;
    let result = data.content_value as ContentByType<T>;
    if (type === "portfolio" && result)
      result = fixPortfolioImages(result as PortfolioContent) as ContentByType<T>;
    return result;
  } catch { return null; }
}

async function saveContentToSupabase<T extends ContentType>(
  type: T,
  content: ContentByType<T>
): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;
  try {
    const { error } = await supabase.from("site_content").upsert(
      { content_type: type, content_key: "data", content_value: content, is_published: true, updated_at: new Date().toISOString() },
      { onConflict: "content_type,content_key" }
    );
    if (error) {
      addErrorLog({ type: "error", page: "/admin", message: `saveContent(${type}): ${error.message}` });
      return false;
    }
    return true;
  } catch (e: any) {
    addErrorLog({ type: "error", page: "/admin", message: `saveContent(${type}): ${e?.message}` });
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function getContent<T extends ContentType>(type: T): Promise<ContentByType<T>> {
  const supabaseContent = await getContentFromSupabase(type);
  if (supabaseContent) {
    try { localStorage.setItem(`${CONTENT_PREFIX}${type}_content`, JSON.stringify(supabaseContent)); } catch {}
    return supabaseContent;
  }
  try {
    const key = `${CONTENT_PREFIX}${type}_content`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as ContentByType<T>;
      if (type === "portfolio") {
        const fixed = fixPortfolioImages(parsed as PortfolioContent);
        if (JSON.stringify(fixed) !== JSON.stringify(parsed)) localStorage.setItem(key, JSON.stringify(fixed));
        return fixed as ContentByType<T>;
      }
      return parsed;
    }
  } catch {}
  return defaultContent[type] as ContentByType<T>;
}

export async function saveContent<T extends ContentType>(type: T, data: ContentByType<T>): Promise<boolean> {
  const supabaseSuccess = await saveContentToSupabase(type, data);
  try {
    localStorage.setItem(`${CONTENT_PREFIX}${type}_content`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("contentUpdated", { detail: { type, data, source: supabaseSuccess ? "supabase" : "localStorage" } }));
    return supabaseSuccess || true;
  } catch { return supabaseSuccess; }
}

export async function updateContent<T extends ContentType>(type: T, updates: Partial<ContentByType<T>>): Promise<boolean> {
  try {
    const current = await getContent(type);
    return await saveContent(type, { ...current, ...updates });
  } catch { return false; }
}

export async function deleteContent(type: ContentType): Promise<boolean> {
  try { localStorage.removeItem(`${CONTENT_PREFIX}${type}_content`); return true; } catch { return false; }
}

export async function initializeContent(): Promise<void> {
  const types: ContentType[] = ["home", "portfolio", "pricing", "reviews", "policies"];
  for (const type of types) {
    const key = `${CONTENT_PREFIX}${type}_content`;
    if (type === "portfolio") {
      const saved = localStorage.getItem(key);
      if (saved && saved.includes(OLD_SUPABASE_URL)) localStorage.removeItem(key);
    }
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(defaultContent[type]));
  }
}

export function clearAllContent(): void {
  ["home", "portfolio", "pricing", "reviews", "policies"].forEach((t) =>
    localStorage.removeItem(`${CONTENT_PREFIX}${t}_content`)
  );
}

export function subscribeToContentUpdates<T extends ContentType>(type: T, callback: (newContent: ContentByType<T>) => void): () => void {
  const handler = (event: CustomEvent) => { if (event.detail.type === type) callback(event.detail.data); };
  window.addEventListener("contentUpdated", handler as EventListener);
  return () => window.removeEventListener("contentUpdated", handler as EventListener);
}

export function isValidContentType(value: string): value is ContentType {
  return ["home", "portfolio", "pricing", "reviews", "policies"].includes(value);
}
export function isValidReview(review: unknown): review is Review {
  if (!review || typeof review !== "object") return false;
  const r = review as Record<string, unknown>;
  return (typeof r.id === "number" || typeof r.id === "string") && typeof r.name === "string" && typeof r.rating === "number" && typeof r.text === "string";
}
