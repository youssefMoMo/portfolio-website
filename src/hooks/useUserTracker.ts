import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * NOTE: `country_code` has been fully removed.
 * The live `user_sessions` table does NOT have a `country_code` column.
 * Including it in any upsert payload causes Supabase to return 400 Bad Request,
 * which breaks the real-time tracking pipeline and can cascade to client UI errors.
 */
interface GeoData {
  country: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 s

/**
 * Ordered list of Geo-IP providers (country name only).
 * `country_code` and `city` columns do NOT exist in the live schema — we only
 * read the human-readable country name here.
 */
const GEO_PROVIDERS: Array<{
  url: string;
  extract: (data: Record<string, unknown>) => GeoData | null;
}> = [
  // ── Provider 1: ipapi.co ──────────────────────────────────────────────────
  {
    url: "https://ipapi.co/json/",
    extract(data) {
      const country = String(data.country_name ?? "").trim();
      if (!country || country === "undefined") return null;
      return { country };
    },
  },

  // ── Provider 2: ip-api.com (free, no key required) ───────────────────────
  {
    url: "http://ip-api.com/json/?fields=status,country",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country ?? "").trim();
      if (!country) return null;
      return { country };
    },
  },

  // ── Provider 3: ipwho.is ─────────────────────────────────────────────────
  {
    url: "https://ipwho.is/",
    extract(data) {
      if (!data.success) return null;
      const country = String(data.country ?? "").trim();
      if (!country) return null;
      return { country };
    },
  },
];

// ─── Geo Lookup with Failover ────────────────────────────────────────────────
async function resolveGeoData(): Promise<GeoData> {
  const fallback: GeoData = { country: "Unknown" };

  for (const provider of GEO_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4_000);

      const res = await fetch(provider.url, {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = (await res.json()) as Record<string, unknown>;
      const geo = provider.extract(json);

      if (geo && geo.country && geo.country !== "Unknown") {
        return geo;
      }
    } catch {
      // Timeout or network failure – try next provider silently
    }
  }

  return fallback;
}

// ─── Session Token Helpers ────────────────────────────────────────────────────
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateSessionToken(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = generateUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return generateUUID();
  }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
/**
 * useUserTracker
 *
 * Tracks the active user session in Supabase `user_sessions`.
 * ONLY writes columns that are confirmed to exist in the live schema:
 *   session_token, current_page, country, last_seen, updated_at
 *
 * Removed columns (DO NOT re-add without adding them to Supabase first):
 *   ✗ country_code  — column does not exist → causes 400 Bad Request
 *   ✗ city          — column does not exist → causes 400 Bad Request
 *
 * All DB calls are wrapped in try/catch so they NEVER crash the client UI.
 */
export function useUserTracker(currentPage: string) {
  const sessionToken = useRef<string>(getOrCreateSessionToken());
  const metaRef = useRef<SessionMeta | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Upsert session row ────────────────────────────────────────────────────
  async function upsertSession(page: string) {
    if (!metaRef.current) return;

    try {
      const { error } = await supabase.from("user_sessions").upsert(
        {
          session_token: metaRef.current.sessionToken,
          current_page: page,
          country: metaRef.current.country,
          // ⚠️  country_code intentionally omitted — column does not exist in live DB
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_token" }
      );

      if (error) {
        // Log silently — never throw, never crash the UI
        console.warn("[useUserTracker] upsert warning:", error.message);
      }
    } catch (err) {
      console.warn("[useUserTracker] upsert exception (suppressed):", err);
    }
  }

  // ── Mount: resolve geo then upsert ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const geo = await resolveGeoData();

        if (cancelled) return;

        metaRef.current = {
          sessionToken: sessionToken.current,
          country: geo.country,
        };

        await upsertSession(currentPage);

        heartbeatTimer.current = setInterval(() => {
          upsertSession(currentPage);
        }, HEARTBEAT_INTERVAL_MS);
      } catch (err) {
        console.warn("[useUserTracker] init exception (suppressed):", err);
      }
    }

    init();

    const handleUnload = () => {
      if (!metaRef.current) return;
      try {
        navigator.sendBeacon(
          `/api/session-end?token=${metaRef.current.sessionToken}`
        );
        supabase
          .from("user_sessions")
          .delete()
          .eq("session_token", metaRef.current.sessionToken)
          .then(() => {/* fire-and-forget */});
      } catch {
        // Suppress unload errors
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cancelled = true;
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      window.removeEventListener("beforeunload", handleUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update current_page on navigation ────────────────────────────────────
  useEffect(() => {
    if (!metaRef.current) return;
    upsertSession(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
}
