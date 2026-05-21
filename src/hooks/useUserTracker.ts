import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoData {
  country: string;
  country_code: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
  country_code: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 s

/**
 * Ordered list of Geo-IP providers (country/country_code only — no city/region/ip
 * since those columns do not exist in the user_sessions table schema).
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
      const code = String(data.country_code ?? "").trim();
      if (!country || country === "undefined") return null;
      return { country, country_code: code };
    },
  },

  // ── Provider 2: ip-api.com (free, no key required) ───────────────────────
  {
    url: "http://ip-api.com/json/?fields=status,country,countryCode",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country ?? "").trim();
      const code = String(data.countryCode ?? "").trim();
      if (!country) return null;
      return { country, country_code: code };
    },
  },

  // ── Provider 3: ipwho.is ─────────────────────────────────────────────────
  {
    url: "https://ipwho.is/",
    extract(data) {
      if (!data.success) return null;
      const country = String(data.country ?? "").trim();
      const code = String(data.country_code ?? "").trim();
      if (!country) return null;
      return { country, country_code: code };
    },
  },
];

// ─── Geo Lookup with Failover ────────────────────────────────────────────────
async function resolveGeoData(): Promise<GeoData> {
  const fallback: GeoData = { country: "Unknown", country_code: "XX" };

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
 * Only writes columns that are guaranteed to exist in the schema:
 *   session_token, current_page, country, country_code, last_seen, updated_at
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
          country_code: metaRef.current.country_code,
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
          country_code: geo.country_code,
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
