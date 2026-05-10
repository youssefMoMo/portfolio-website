// ═══════════════════════════════════════════════════════════════
// CONTENT MANAGER — single source of truth = Supabase
// src/lib/contentManager.ts
//
// Architecture rules (this file is the contract):
//   • Writes go to Supabase ONLY. If Supabase fails, the write fails —
//     caller MUST surface a real error to the admin. We never return
//     `true` to mask a failed save.
//   • Reads come from Supabase first. localStorage is used as a READ
//     CACHE so the page can paint quickly while Supabase responds, and
//     so the public site has *something* if Supabase is briefly down.
//     The cache is refreshed on every successful read.
//   • Bundled defaults from data.ts are the absolute last fallback —
//     used only if Supabase is unreachable AND no cache exists. They
//     are never written back to Supabase.
//   • Reviews follow a clean status workflow: pending → approved | rejected.
//     `verified` and `featured` are independent admin-controlled booleans.
// ═══════════════════════════════════════════════════════════════

import { supabase, isSupabaseEnabled } from "./supabase";
import {
  reviewsData,
  pricingPlans,
  policies as defaultPoliciesData,
  portfolioItems as defaultPortfolioItems,
} from "./data";

const CONTENT_PREFIX  = "admin_";
const OLD_SUPABASE_URL = "lshrxznzibzvvulphtrr.supabase.co"; // legacy migration helper

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
export interface PortfolioContent { items: PortfolioItem[] }
export interface PricingPlan {
  id: number | string; name: string; price_usd: string; price_robux: string;
  frames: string; features?: string[]; featured?: boolean; icon?: string;
  display_order?: number; is_published?: boolean;
}
export interface PricingContent { plans: PricingPlan[] }

// Review status — explicit workflow, no overlap with `verified`/`featured`.
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  project_type: string;
  date: string;
  status: ReviewStatus;
  verified?: boolean;          // admin-marked: this is a real verified client
  featured?: boolean;          // admin-marked: pin to top of marquee
  avatar?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at?: string;
}
export interface ReviewsContent {
  reviews: Review[];
  page_title?: string;
  page_description?: string;
}
export interface Policy {
  id: number | string; title: string; description: string; icon: string;
  display_order?: number; is_published?: boolean; created_at?: string; updated_at?: string;
}
export interface PoliciesContent {
  policies: Policy[];
  page_title?: string;
  page_description?: string;
}

// ═══════════════════════════════════════════════════════════════
// ERROR LOG (used by addErrorLog throughout codebase)
// ═══════════════════════════════════════════════════════════════

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
  } catch { /* ignore — error logging shouldn't crash the page */ }
}

export function getErrorLogs(): ErrorLog[] {
  try {
    const raw = localStorage.getItem(ERROR_LOGS_KEY);
    return raw ? (JSON.parse(raw) as ErrorLog[]) : [];
  } catch { return []; }
}

export function clearErrorLogs(): void {
  try { localStorage.removeItem(ERROR_LOGS_KEY); } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// CONTENT-TYPE MAP + DEFAULTS
// ═══════════════════════════════════════════════════════════════

export type ContentType = "home" | "portfolio" | "pricing" | "reviews" | "policies";

export type ContentByType<T extends ContentType> =
  T extends "home"      ? HomeContent      :
  T extends "portfolio" ? PortfolioContent :
  T extends "pricing"   ? PricingContent   :
  T extends "reviews"   ? ReviewsContent   :
  T extends "policies"  ? PoliciesContent  :
  never;

const defaultContent = {
  home: {
    hero_badge: "Available for new projects",
    hero_title1: "Designing experiences",
    hero_title2: "that drive growth",
    hero_subtitle: "I'm a UI/UX designer specialised in Roblox interfaces.",
    stats_projects: "+160", stats_clients: "+70",
    stats_rating: "95%",    stats_years: "+4",
    cta_title: "Ready to start your project?",
    cta_subtitle: "Let's talk on Discord.",
  } as HomeContent,
  portfolio: {
    items: defaultPortfolioItems.map((item, i) => ({
      ...item, display_order: i, is_published: true,
    })) as PortfolioItem[],
  } as PortfolioContent,
  pricing: {
    plans: pricingPlans.map((p, i) => ({ ...p, display_order: i, is_published: true })) as PricingPlan[],
  } as PricingContent,
  reviews: {
    reviews: reviewsData.map((r) => ({
      ...r,
      id:     String(r.id),
      status: "approved" as ReviewStatus,
    })),
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
// CACHE (read-only — never used to mask a failed save)
// ═══════════════════════════════════════════════════════════════

function cacheKey(type: ContentType): string {
  return `${CONTENT_PREFIX}${type}_content_cache`;
}

function readCache<T extends ContentType>(type: T): ContentByType<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(type));
    return raw ? (JSON.parse(raw) as ContentByType<T>) : null;
  } catch { return null; }
}

function writeCache<T extends ContentType>(type: T, value: ContentByType<T>): void {
  try { localStorage.setItem(cacheKey(type), JSON.stringify(value)); } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO IMAGE MIGRATION (legacy)
// ═══════════════════════════════════════════════════════════════

function fixPortfolioImages(content: PortfolioContent): PortfolioContent {
  return {
    ...content,
    items: content.items.map((item, i) => ({
      ...item,
      image: item.image && item.image.includes(OLD_SUPABASE_URL)
        ? `/images/portfolio/work${(i % 22) + 1}.png`
        : item.image,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// READ — getContent (Supabase first → cache → defaults)
// ═══════════════════════════════════════════════════════════════

/**
 * Read site_content for the given type.
 * Always returns a value: bundled defaults if Supabase + cache both miss.
 */
export async function getContent<T extends ContentType>(type: T): Promise<ContentByType<T>> {
  // 1. Try Supabase (source of truth)
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from("site_content")
        .select("content_value")
        .eq("content_type", type)
        .eq("content_key", "data")
        .eq("is_published", true)
        .maybeSingle();

      if (!error && data?.content_value) {
        let result = data.content_value as ContentByType<T>;
        if (type === "portfolio") {
          result = fixPortfolioImages(result as PortfolioContent) as ContentByType<T>;
        }
        writeCache(type, result);
        return result;
      }
      // No row yet — that's fine, fall through to cache/defaults
    } catch (e: unknown) {
      addErrorLog({
        type: "network",
        page: "/(content)",
        message: `getContent(${type}) supabase error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // 2. Cache (last successful Supabase read)
  const cached = readCache(type);
  if (cached) {
    if (type === "portfolio") return fixPortfolioImages(cached as PortfolioContent) as ContentByType<T>;
    return cached;
  }

  // 3. Bundled defaults (absolute fallback)
  return defaultContent[type] as ContentByType<T>;
}

// ═══════════════════════════════════════════════════════════════
// WRITE — saveContent (Supabase ONLY — no silent localStorage fallback)
// ═══════════════════════════════════════════════════════════════

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/**
 * Save site_content for the given type. Supabase is the only durable
 * destination. Cache is updated only on success. On failure, returns
 * `{ ok: false, error }` — caller MUST surface this to the user.
 */
export async function saveContent<T extends ContentType>(
  type: T,
  data: ContentByType<T>,
): Promise<SaveResult> {
  if (!isSupabaseEnabled || !supabase) {
    const error = "Supabase is not configured — admin saves are disabled.";
    addErrorLog({ type: "error", page: "/admin", message: `saveContent(${type}): ${error}` });
    return { ok: false, error };
  }

  try {
    const { error } = await supabase.from("site_content").upsert(
      {
        content_type: type,
        content_key:  "data",
        content_value: data,
        is_published: true,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "content_type,content_key" },
    );

    if (error) {
      addErrorLog({ type: "error", page: "/admin", message: `saveContent(${type}): ${error.message}` });
      return { ok: false, error: error.message };
    }

    // Success — update cache + notify any in-tab listeners
    writeCache(type, data);
    try {
      window.dispatchEvent(new CustomEvent("contentUpdated", {
        detail: { type, data, source: "supabase" },
      }));
    } catch { /* ignore */ }
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    addErrorLog({ type: "error", page: "/admin", message: `saveContent(${type}): ${message}` });
    return { ok: false, error: message };
  }
}

/**
 * Convenience: merge updates over current content and save.
 * Returns the same SaveResult — no silent fallbacks.
 */
export async function updateContent<T extends ContentType>(
  type: T,
  updates: Partial<ContentByType<T>>,
): Promise<SaveResult> {
  const current = await getContent(type);
  return saveContent(type, { ...current, ...updates });
}

// ═══════════════════════════════════════════════════════════════
// REVIEWS — explicit status workflow
// ═══════════════════════════════════════════════════════════════

/**
 * Submit a review (called from the public Reviews page).
 * Always inserted with status='pending' — never publicly visible until
 * an admin approves. Returns SaveResult so the UI can show a real error.
 */
export async function submitReviewToTable(
  review: Pick<Review, "name" | "rating" | "text" | "project_type" | "date" | "avatar">,
): Promise<SaveResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: "Supabase is not configured — review submissions are disabled." };
  }

  const payload = {
    name:         review.name.trim(),
    rating:       review.rating,
    text:         review.text.trim(),
    project_type: review.project_type || "UI Design",
    date:         review.date || new Date().toISOString().split("T")[0],
    avatar:       review.avatar || review.name.charAt(0).toUpperCase(),
    status:       "pending" as ReviewStatus,
    verified:     false,
    featured:     false,
  };

  try {
    const { error } = await supabase.from("reviews").insert(payload);
    if (error) {
      addErrorLog({ type: "error", page: "/reviews", message: `submitReview: ${error.message}` });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    addErrorLog({ type: "error", page: "/reviews", message: `submitReview: ${message}` });
    return { ok: false, error: message };
  }
}

/**
 * Reviews visible on the PUBLIC site — only `status='approved'`.
 * Falls back to bundled defaults if Supabase is unreachable.
 */
export async function getAllReviews(): Promise<Review[]> {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map(normalizeReviewRow);
      }
    } catch (e: unknown) {
      addErrorLog({
        type: "network",
        page: "/reviews",
        message: `getAllReviews: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // Fallback to bundled approved reviews
  return defaultContent.reviews.reviews;
}

/**
 * Reviews list for the ADMIN dashboard — every status, newest first.
 */
export async function getAllReviewsForAdmin(): Promise<Review[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      addErrorLog({ type: "error", page: "/admin", message: `getAllReviewsForAdmin: ${error.message}` });
      return [];
    }
    return (data || []).map(normalizeReviewRow);
  } catch (e: unknown) {
    addErrorLog({ type: "error", page: "/admin", message: `getAllReviewsForAdmin: ${e instanceof Error ? e.message : String(e)}` });
    return [];
  }
}

function normalizeReviewRow(r: Record<string, unknown>): Review {
  // Handle rows from BEFORE the migration that may still have only
  // `approved` / `rejected` booleans. Prefer the new `status` column.
  const explicitStatus = r.status as ReviewStatus | undefined;
  const legacyStatus: ReviewStatus =
    r.rejected ? "rejected" :
    r.approved ? "approved" :
    "pending";

  return {
    id:            String(r.id),
    name:          String(r.name ?? ""),
    rating:        Number(r.rating ?? 5),
    text:          String(r.text ?? ""),
    project_type:  String(r.project_type ?? "UI Design"),
    date:          String(r.date ?? r.created_at?.toString().split("T")[0] ?? ""),
    status:        explicitStatus ?? legacyStatus,
    verified:      Boolean(r.verified),
    featured:      Boolean(r.featured),
    avatar:        (r.avatar as string) ?? String(r.name ?? "?").charAt(0).toUpperCase(),
    approved_by:   (r.approved_by as string) ?? null,
    approved_at:   (r.approved_at as string) ?? null,
    rejected_at:   (r.rejected_at as string) ?? null,
    created_at:    r.created_at as string | undefined,
  };
}

/**
 * Approve a pending review (admin only). Sets status='approved' and stamps
 * approved_at to now. Optionally sets featured/verified.
 */
export async function approveReview(
  id: string,
  options?: { featured?: boolean; verified?: boolean },
): Promise<SaveResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  try {
    const update: Record<string, unknown> = {
      status:      "approved",
      approved_at: new Date().toISOString(),
      rejected_at: null,
    };
    if (options?.featured !== undefined) update.featured = options.featured;
    if (options?.verified !== undefined) update.verified = options.verified;

    const { error } = await supabase.from("reviews").update(update).eq("id", id);
    if (error) {
      addErrorLog({ type: "error", page: "/admin", message: `approveReview: ${error.message}` });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Reject a pending review (hides it from public). */
export async function rejectReview(id: string): Promise<SaveResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  try {
    const { error } = await supabase.from("reviews").update({
      status:      "rejected",
      rejected_at: new Date().toISOString(),
      approved_at: null,
    }).eq("id", id);
    if (error) {
      addErrorLog({ type: "error", page: "/admin", message: `rejectReview: ${error.message}` });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Permanently delete a review (admin only). */
export async function deleteReviewFromTable(id: string): Promise<SaveResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  try {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-TAB EVENT BRIDGE (admin → other tabs/components in same window)
// ═══════════════════════════════════════════════════════════════

/**
 * For real cross-tab/cross-user updates, public pages use Supabase
 * Realtime via `useContentRealtime`. This event bridge is just a
 * convenience for the SAME tab so editor previews update instantly.
 */
export function subscribeToContentUpdates<T extends ContentType>(
  type: T,
  callback: (newContent: ContentByType<T>) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as { type: ContentType; data: unknown };
    if (detail?.type === type) callback(detail.data as ContentByType<T>);
  };
  window.addEventListener("contentUpdated", handler);
  return () => window.removeEventListener("contentUpdated", handler);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function isValidContentType(value: string): value is ContentType {
  return ["home", "portfolio", "pricing", "reviews", "policies"].includes(value);
}

export function isValidReview(review: unknown): review is Review {
  if (!review || typeof review !== "object") return false;
  const r = review as Record<string, unknown>;
  return typeof r.name === "string" &&
         typeof r.rating === "number" &&
         typeof r.text === "string";
}

/** Removes legacy local cache entries — useful when shipping schema changes. */
export function clearLocalCache(): void {
  (["home", "portfolio", "pricing", "reviews", "policies"] as ContentType[]).forEach((t) => {
    try {
      localStorage.removeItem(cacheKey(t));
      localStorage.removeItem(`${CONTENT_PREFIX}${t}_content`); // legacy key
    } catch { /* ignore */ }
  });
}
