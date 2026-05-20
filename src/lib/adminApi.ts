// src/lib/adminApi.ts — All admin operations via Supabase directly (no PHP backend)
// FIX: All mutations now write BOTH the legacy boolean columns (approved/rejected)
//      AND the canonical `status` column that contentManager.getAllReviews() queries.
//      Without `status`, reviews created/approved here were invisible on the public page.

import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────────────────
export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  project_type: string;
  date: string;
  verified: boolean;
  featured?: boolean;
  // Legacy boolean columns (kept for backward compat & admin UI)
  approved: boolean;
  rejected: boolean;
  // Canonical status column read by contentManager.getAllReviews()
  status?: "pending" | "approved" | "rejected";
  avatar?: string;
  created_at: string;
  approved_by?: string;
}

export interface SiteUser {
  id: string;
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  is_banned: boolean;
  banned_at?: string;
  last_seen?: string;
  created_at: string;
}

export interface AnalyticsData {
  reviews: { total: number; pending: number; approved: number; avg_rating: number };
  games:   { total: number; active: number; top: { name: string; visits: number; icon_url: string }[] };
  portfolio: { items: number };
  content:   { sections: number; last_updated: string | null };
  recent_reviews: Review[];
  generated_at: string;
}

// ── Helper ─────────────────────────────────────────────────────
function assertSupabase(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase;
}

// ── Analytics ──────────────────────────────────────────────────
export const analyticsApi = {
  get: async (): Promise<AnalyticsData> => {
    const db = assertSupabase();

    const [
      reviewsAll, reviewsPending, reviewsApproved, ratingsRows,
      topGames, totalGames, activeGames,
      portfolio, contentSections, recentReviews,
    ] = await Promise.all([
      db.from("reviews").select("*", { count: "exact", head: true }),
      // Pending = status is "pending" OR (legacy: approved=false AND rejected=false)
      db.from("reviews").select("*", { count: "exact", head: true }).or("status.eq.pending,and(approved.eq.false,rejected.eq.false)"),
      db.from("reviews").select("*", { count: "exact", head: true }).or("status.eq.approved,approved.eq.true"),
      db.from("reviews").select("rating").or("status.eq.approved,approved.eq.true").limit(1000),
      db.from("games").select("name, visits, icon_url").eq("is_published", true).order("visits", { ascending: false }).limit(5),
      db.from("games").select("*", { count: "exact", head: true }),
      db.from("games").select("*", { count: "exact", head: true }).eq("is_published", true),
      db.from("site_content").select("content_value").eq("content_type", "portfolio").eq("content_key", "data").maybeSingle(),
      db.from("site_content").select("content_type, updated_at").order("updated_at", { ascending: false }).limit(20),
      db.from("reviews").select("id, name, rating, text, project_type, approved, rejected, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const ratings   = (ratingsRows.data ?? []).map(r => Number(r.rating));
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0;
    const portfolioCount = (portfolio.data?.content_value as { items?: unknown[] })?.items?.length ?? 0;

    return {
      reviews: {
        total:    reviewsAll.count    ?? 0,
        pending:  reviewsPending.count  ?? 0,
        approved: reviewsApproved.count ?? 0,
        avg_rating: avgRating,
      },
      games: {
        total:  totalGames.count  ?? 0,
        active: activeGames.count ?? 0,
        top: (topGames.data ?? []).map(g => ({
          name:     g.name,
          visits:   g.visits ?? 0,
          icon_url: g.icon_url ?? "",
        })),
      },
      portfolio:  { items: portfolioCount },
      content: {
        sections:     contentSections.data?.length ?? 0,
        last_updated: contentSections.data?.[0]?.updated_at ?? null,
      },
      recent_reviews: (recentReviews.data ?? []) as Review[],
      generated_at: new Date().toISOString(),
    };
  },
};

// ── Reviews ───────────────────────────────────────────────────
export const reviewsApi = {
  /**
   * List reviews by status. Checks both the canonical `status` column
   * AND the legacy boolean columns so older rows are still visible.
   */
  list: async (status: "all" | "pending" | "approved" | "rejected" = "all", page = 1): Promise<Review[]> => {
    const db   = assertSupabase();
    const PAGE = 20;
    let q = db.from("reviews").select("*").order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);

    if (status === "pending") {
      // status='pending' OR (no status AND approved=false AND rejected=false)
      q = q.or("status.eq.pending,and(approved.eq.false,rejected.eq.false)");
    } else if (status === "approved") {
      q = q.or("status.eq.approved,approved.eq.true");
    } else if (status === "rejected") {
      q = q.or("status.eq.rejected,rejected.eq.true");
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Review[];
  },

  /**
   * Approve a review — writes BOTH the legacy boolean AND the canonical
   * `status` column so contentManager.getAllReviews() sees it immediately.
   */
  approve: async (id: string): Promise<void> => {
    const { error } = await assertSupabase().from("reviews").update({
      approved:    true,
      rejected:    false,
      status:      "approved",          // ← canonical column for public query
      approved_at: new Date().toISOString(),
      rejected_at: null,
      updated_at:  new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },

  /** Reject a review — writes both legacy and canonical columns. */
  reject: async (id: string): Promise<void> => {
    const { error } = await assertSupabase().from("reviews").update({
      approved:    false,
      rejected:    true,
      status:      "rejected",          // ← canonical column
      rejected_at: new Date().toISOString(),
      approved_at: null,
      updated_at:  new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await assertSupabase().from("reviews").delete().eq("id", id);
    if (error) throw error;
  },

  update: async (id: string, fields: Partial<Pick<Review, "text" | "name" | "rating" | "project_type">>): Promise<void> => {
    const { error } = await assertSupabase().from("reviews").update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },

  /**
   * Create a review from the admin panel.
   * Writes `status` so the public Reviews page reflects it instantly —
   * no cache flush or manual Supabase migration needed.
   */
  create: async (fields: {
    name: string;
    rating: number;
    text: string;
    project_type: string;
    avatar?: string;
    date?: string;
    approved?: boolean;
    featured?: boolean;
    verified?: boolean;
  }): Promise<void> => {
    const now = new Date().toISOString();
    const isApproved = fields.approved ?? false;

    const insertPayload: Record<string, unknown> = {
      name:         fields.name,
      rating:       fields.rating,
      text:         fields.text,
      project_type: fields.project_type,
      avatar:       fields.avatar || fields.name.charAt(0).toUpperCase(),
      date:         fields.date ?? now.split("T")[0],
      // Legacy boolean columns
      approved:     isApproved,
      rejected:     false,
      // Canonical status column — this is what contentManager.getAllReviews() filters on
      status:       isApproved ? "approved" : "pending",
      approved_at:  isApproved ? now : null,
      rejected_at:  null,
      featured:     fields.featured ?? false,
      verified:     fields.verified ?? false,
      created_at:   now,
      updated_at:   now,
    };
    const { error } = await assertSupabase()
      .from("reviews")
      .insert([insertPayload]);
    if (error) throw error;
  },

  pin: async (id: string, featured: boolean): Promise<void> => {
    const { error } = await assertSupabase().from("reviews").update({
      featured,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },
};

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
  list: async (page = 1, search = ""): Promise<{ users: SiteUser[]; total: number; page: number; limit: number }> => {
    const db    = assertSupabase();
    const LIMIT = 25;
    let q = db.from("site_visitors").select("*", { count: "exact" })
              .order("last_seen", { ascending: false })
              .range((page - 1) * LIMIT, page * LIMIT - 1);
    if (search.trim()) {
      q = q.or(`discord_username.ilike.%${search}%,discord_id.eq.${search}`);
    }
    const { data, count, error } = await q;
    if (error) throw error;
    return { users: (data ?? []) as SiteUser[], total: count ?? 0, page, limit: LIMIT };
  },

  ban: async (id: string): Promise<void> => {
    const { error } = await assertSupabase().from("site_visitors").update({
      is_banned: true, banned_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },

  unban: async (id: string): Promise<void> => {
    const { error } = await assertSupabase().from("site_visitors").update({
      is_banned: false, banned_at: null, updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },
};
