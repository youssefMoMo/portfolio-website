// src/lib/adminApi.ts
//
// ✅ REALTIME FIX:
//   - All moderation payloads now accept an optional `sessionToken` field.
//   - After every DB write, a Supabase Broadcast is fired on the EXACT same
//     channel name the client subscribes to: `app-session-${sessionToken}`.
//   - This gives two delivery paths:
//       1. postgres_changes  — persisted, fires within ~500 ms (requires REPLICA
//          IDENTITY FULL on the table, which may not be set)
//       2. Broadcast         — ephemeral, fires instantly (<50 ms), no DB config
//          needed. This is the primary "live action" path.
//   - If sessionToken is omitted the broadcast is skipped silently; the DB write
//     still happens.

import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fires a one-shot Supabase Broadcast on the user's private channel.
 * The user's App.tsx subscribes to this same channel and handles the payload.
 *
 * Pattern: subscribe → wait for SUBSCRIBED → send → cleanup after 2 s.
 * A 3 s hard timeout prevents the promise from hanging forever.
 */
async function broadcastToSession(
  sessionToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<void> {
  return new Promise((resolve) => {
    const CHANNEL = `app-session-${sessionToken}`;
    let done = false;

    const hardTimeout = setTimeout(() => {
      if (!done) {
        done = true;
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
        resolve();
      }
    }, 3_000);

    const ch = supabase.channel(CHANNEL, { config: { broadcast: { ack: false } } });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" && !done) {
        ch.send({ type: "broadcast", event: "admin_action", payload })
          .then(() => {
            setTimeout(() => {
              done = true;
              clearTimeout(hardTimeout);
              try { supabase.removeChannel(ch); } catch { /* ignore */ }
              resolve();
            }, 300);
          })
          .catch(() => {
            done = true;
            clearTimeout(hardTimeout);
            try { supabase.removeChannel(ch); } catch { /* ignore */ }
            resolve();
          });
      }
    });
  });
}

// ─── Moderation payloads ──────────────────────────────────────────────────────

export interface BanPayload {
  sessionId: string;
  /** Include so we can broadcast instantly to the user's live channel. */
  sessionToken?: string;
  reason?: string;
}

export interface UnbanPayload {
  sessionId: string;
  sessionToken?: string;
  unbanMessage?: string;
}

export interface BroadcastPayload {
  sessionId: string;
  sessionToken?: string;
  message: string | null; // null clears the message
}

// ─── Review type ──────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  project_type: string;
  date: string;
  status?: "pending" | "approved" | "rejected";
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

// ─── Analytics data shape ─────────────────────────────────────────────────────
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

// ─── Safe query helper ────────────────────────────────────────────────────────
async function safeQuery<T>(
  queryFn: () => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.warn("[adminApi] query warning:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("[adminApi] query exception (suppressed):", err);
    return [];
  }
}

// ─── Ban / Unban / Broadcast ──────────────────────────────────────────────────

export async function banUser({ sessionId, sessionToken, reason }: BanPayload) {
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

  // Immediate broadcast — fires even if postgres_changes isn't configured
  if (sessionToken) {
    await broadcastToSession(sessionToken, {
      action: "ban",
      reason: reason ?? null,
    });
  }
}

export async function unbanUser({ sessionId, sessionToken, unbanMessage }: UnbanPayload) {
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

  if (sessionToken) {
    await broadcastToSession(sessionToken, {
      action: "unban",
      unbanMessage: unbanMessage ?? null,
    });
  }
}

export async function sendAdminMessage({ sessionId, sessionToken, message }: BroadcastPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({ admin_message: message, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(`sendAdminMessage failed: ${error.message}`);

  if (sessionToken) {
    await broadcastToSession(sessionToken, {
      action: message ? "message" : "clear_message",
      message: message ?? null,
    });
  }
}

export async function clearAdminMessage(sessionId: string, sessionToken?: string) {
  return sendAdminMessage({ sessionId, sessionToken, message: null });
}

/**
 * Hard-deletes ALL rows from user_sessions.
 * Used by the admin "Clear All Sessions" button.
 * The .neq filter is a Supabase requirement — DELETE without a WHERE clause
 * is blocked by default; matching on a column that every row satisfies
 * (id != '00000000-0000-0000-0000-000000000000') effectively targets all rows.
 */
export async function deleteAllSessions(): Promise<void> {
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`deleteAllSessions failed: ${error.message}`);
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
  list: async (filter: ReviewFilter = "all", page = 1): Promise<Review[]> => {
    const PAGE_SIZE = 20;
    try {
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
    } catch (err) {
      console.warn("[reviewsApi.list] error (suppressed):", err);
      return [];
    }
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
    data: Partial<Pick<Review, "name" | "text" | "rating" | "project_type" | "date" | "verified" | "featured" | "avatar">>
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
  get: async (): Promise<AnalyticsData> => {
    const now = new Date().toISOString();

    const [rawReviews, contentRows, gamesRows] = await Promise.all([
      safeQuery<AnyRow>(() =>
        supabase
          .from("reviews")
          .select("id, name, project_type, rating, text, status, approved, rejected, created_at")
          .order("created_at", { ascending: false }) as any
      ),
      safeQuery<AnyRow>(() =>
        supabase
          .from("site_content")
          .select("content_type, updated_at")
          .order("updated_at", { ascending: false }) as any
      ),
      // NOTE: is_active does NOT exist — use is_published instead.
      safeQuery<AnyRow>(() =>
        supabase
          .from("games")
          .select("id, name, visits, is_published") as any
      ),
    ]);

    const isApproved = (r: AnyRow) =>
      r.status === "approved" || r.approved === true;
    const isPending = (r: AnyRow) =>
      !isApproved(r) && !(r.status === "rejected" || r.rejected === true);

    const approvedReviews = rawReviews.filter(isApproved);
    const pendingReviews  = rawReviews.filter(isPending);
    const avgRating =
      approvedReviews.length > 0
        ? Math.round(
            (approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
              approvedReviews.length) * 10
          ) / 10
        : 0;

    const contentSections = new Set(contentRows.map((c) => c.content_type as string)).size;
    const lastUpdated = (contentRows[0]?.updated_at as string) ?? null;

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
        total: gamesRows.length,
        active: gamesRows.filter((g) => g.is_published).length,
        top: topGames,
      },
      reviews: {
        total: rawReviews.length,
        pending: pendingReviews.length,
        approved: approvedReviews.length,
        avg_rating: avgRating,
      },
      portfolio: {
        items: contentRows.filter((c) => c.content_type === "portfolio").length,
      },
      content: {
        sections: contentSections,
        last_updated: lastUpdated,
      },
      recent_reviews: rawReviews.slice(0, 5).map((r) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? ""),
        project_type: String(r.project_type ?? ""),
        rating: Number(r.rating) || 0,
        text: String(r.text ?? ""),
        approved: isApproved(r),
        rejected: r.status === "rejected" || r.rejected === true,
      })),
    };
  },
};
