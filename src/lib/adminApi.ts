import { supabase } from "@/lib/supabase";

// ─── Moderation payloads ──────────────────────────────────────────────────────

export interface BanPayload {
  sessionId: string;
  reason?: string;
}

export interface UnbanPayload {
  sessionId: string;
  unbanMessage?: string;
}

export interface BroadcastPayload {
  sessionId: string;
  message: string | null; // null clears the message
}

// ─── Review type (superset of contentManager.Review — adds DB boolean cols) ──
export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  project_type: string;
  date: string;
  status?: "pending" | "approved" | "rejected";
  /** Legacy boolean columns some DB schemas store alongside `status` */
  approved?: boolean;
  rejected?: boolean;
  featured?: boolean;
  verified?: boolean;
  avatar?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Analytics data shape (used by AnalyticsTab) ─────────────────────────────

export interface AnalyticsData {
  generated_at: string;
  games: {
    total: number;
    active: number;
    top: Array<{ name: string; icon_url: string | null; visits: number }>;
  };
  reviews: {
    total: number;
    pending: number;
    approved: number;
    avg_rating: number;
  };
  portfolio: {
    items: number;
  };
  content: {
    sections: number;
    last_updated: string | null;
  };
  recent_reviews: Array<{
    id: string;
    name: string;
    project_type: string;
    rating: number;
    text: string;
    approved: boolean;
    rejected: boolean;
  }>;
}

// ─── Helper: safe cast unknown row ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

// ─── Ban / Unban / Broadcast ──────────────────────────────────────────────────

export async function banUser({ sessionId, reason }: BanPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      is_banned: true,
      ban_reason: reason ?? null,
      unban_message: null,
      admin_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw new Error(`banUser failed: ${error.message}`);
}

export async function unbanUser({ sessionId, unbanMessage }: UnbanPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      is_banned: false,
      ban_reason: null,
      unban_message: unbanMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw new Error(`unbanUser failed: ${error.message}`);
}

export async function sendAdminMessage({ sessionId, message }: BroadcastPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({ admin_message: message, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(`sendAdminMessage failed: ${error.message}`);
}

export async function clearAdminMessage(sessionId: string) {
  return sendAdminMessage({ sessionId, message: null });
}

export async function clearUnbanMessage(sessionId: string) {
  const { error } = await supabase
    .from("user_sessions")
    .update({ unban_message: null, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(`clearUnbanMessage failed: ${error.message}`);
}

// ─── Reviews API ──────────────────────────────────────────────────────────────

type ReviewFilter = "all" | "pending" | "approved" | "rejected";

interface ReviewCreatePayload {
  name: string;
  rating: number;
  text: string;
  project_type: string;
  avatar?: string;
  date?: string;
  approved?: boolean;
  featured?: boolean;
  verified?: boolean;
}

export const reviewsApi = {
  /** Paginated list filtered by status. */
  list: async (filter: ReviewFilter = "all", page = 1): Promise<Review[]> => {
    const PAGE_SIZE = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filter === "pending") {
      q = q.eq("status", "pending");
    } else if (filter === "approved") {
      q = q.or("status.eq.approved,approved.eq.true");
    } else if (filter === "rejected") {
      q = q.or("status.eq.rejected,rejected.eq.true");
    }

    const { data, error } = await q;
    if (error) throw new Error(`reviewsApi.list: ${error.message}`);
    return (data ?? []) as Review[];
  },

  approve: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("reviews")
      .update({
        status: "approved",
        approved: true,
        rejected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`reviewsApi.approve: ${error.message}`);
  },

  reject: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("reviews")
      .update({
        status: "rejected",
        rejected: true,
        approved: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`reviewsApi.reject: ${error.message}`);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw new Error(`reviewsApi.delete: ${error.message}`);
  },

  pin: async (id: string, featured: boolean): Promise<void> => {
    const { error } = await supabase
      .from("reviews")
      .update({ featured, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`reviewsApi.pin: ${error.message}`);
  },

  update: async (
    id: string,
    data: Partial<Pick<Review, "name" | "text" | "rating" | "project_type">>,
  ): Promise<void> => {
    const { error } = await supabase
      .from("reviews")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`reviewsApi.update: ${error.message}`);
  },

  create: async (data: ReviewCreatePayload): Promise<void> => {
    const { error } = await supabase.from("reviews").insert({
      ...data,
      status: data.approved ? "approved" : "pending",
      date: data.date ?? new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`reviewsApi.create: ${error.message}`);
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  /**
   * Aggregates data from reviews, site_content, and games tables.
   * Each query is run in parallel; failures are handled gracefully so a
   * missing table never crashes the analytics view entirely.
   */
  get: async (): Promise<AnalyticsData> => {
    const now = new Date().toISOString();

    const [reviewsRes, contentRes, gamesRes] = await Promise.allSettled([
      supabase
        .from("reviews")
        .select("id, name, project_type, rating, text, status, approved, rejected, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("site_content")
        .select("content_type, updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("games")
        .select("id, name, icon_url, visits, is_active"),
    ]);

    // ── Reviews ───────────────────────────────────────────────────────────
    const rawReviews: AnyRow[] =
      reviewsRes.status === "fulfilled" ? (reviewsRes.value.data ?? []) : [];

    const isApproved = (r: AnyRow) =>
      r.status === "approved" || r.approved === true;
    const isPending = (r: AnyRow) =>
      !isApproved(r) && !(r.status === "rejected" || r.rejected === true);

    const approvedReviews = rawReviews.filter(isApproved);
    const pendingReviews  = rawReviews.filter(isPending);
    const avgRating =
      approvedReviews.length > 0
        ? Math.round(
            (approvedReviews.reduce(
              (sum, r) => sum + (Number(r.rating) || 0),
              0,
            ) /
              approvedReviews.length) *
              10,
          ) / 10
        : 0;

    // ── Content ───────────────────────────────────────────────────────────
    const contentRows: AnyRow[] =
      contentRes.status === "fulfilled" ? (contentRes.value.data ?? []) : [];
    const contentSections = new Set(contentRows.map((c) => c.content_type as string)).size;
    const lastUpdated      = (contentRows[0]?.updated_at as string) ?? null;

    // ── Games ──────────────────────────────────────────────────────────────
    const gamesRows: AnyRow[] =
      gamesRes.status === "fulfilled" ? (gamesRes.value.data ?? []) : [];
    const topGames = [...gamesRows]
      .sort((a, b) => (Number(b.visits) || 0) - (Number(a.visits) || 0))
      .slice(0, 5)
      .map((g) => ({
        name: String(g.name ?? ""),
        icon_url: (g.icon_url as string | null) ?? null,
        visits: Number(g.visits) || 0,
      }));

    return {
      generated_at: now,
      games: {
        total:  gamesRows.length,
        active: gamesRows.filter((g) => g.is_active).length,
        top:    topGames,
      },
      reviews: {
        total:      rawReviews.length,
        pending:    pendingReviews.length,
        approved:   approvedReviews.length,
        avg_rating: avgRating,
      },
      portfolio: {
        items: contentRows.filter((c) => c.content_type === "portfolio").length,
      },
      content: {
        sections:     contentSections,
        last_updated: lastUpdated,
      },
      recent_reviews: rawReviews.slice(0, 5).map((r) => ({
        id:           String(r.id ?? ""),
        name:         String(r.name ?? ""),
        project_type: String(r.project_type ?? ""),
        rating:       Number(r.rating) || 0,
        text:         String(r.text ?? ""),
        approved:     isApproved(r),
        rejected:     r.status === "rejected" || r.rejected === true,
      })),
    };
  },
};
