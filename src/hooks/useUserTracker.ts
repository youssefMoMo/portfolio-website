import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoData {
  country: string;
  country_code: string;
  city?: string;
  region?: string;
  ip?: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
  country_code: string;
  city?: string;
  region?: string;
  ip?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 s

/**
 * Ordered list of Geo-IP providers.
 * Each entry is tried in sequence; the first that returns a valid country wins.
 *
 * FIX: Previously only one provider was used. Cloud-proxy header translation
 * drops or rate-limits on that provider, leaving `country` as "Unknown". We
 * now walk through a failover chain of three independent APIs.
 *
 * Also fixed: removed the `uuid` package dependency (not in package.json).
 * We now use the native `crypto.randomUUID()` which is available in all
 * modern browsers and in Node ≥ 14.17 (Vercel's runtime).
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
      return {
        country,
        country_code: code,
        city: String(data.city ?? ""),
        region: String(data.region ?? ""),
        ip: String(data.ip ?? ""),
      };
    },
  },

  // ── Provider 2: ip-api.com (free, no key required) ───────────────────────
  {
    url: "http://ip-api.com/json/?fields=status,country,countryCode,city,regionName,query",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country ?? "").trim();
      const code = String(data.countryCode ?? "").trim();
      if (!country) return null;
      return {
        country,
        country_code: code,
        city: String(data.city ?? ""),
        region: String(data.regionName ?? ""),
        ip: String(data.query ?? ""),
      };
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
      return {
        country,
        country_code: code,
        city: String(data.city ?? ""),
        region: String(data.region ?? ""),
        ip: String(data.ip ?? ""),
      };
    },
  },
];

// ─── Geo Lookup with Failover ────────────────────────────────────────────────
async function resolveGeoData(): Promise<GeoData> {
  const fallback: GeoData = {
    country: "Unknown",
    country_code: "XX",
  };

  for (const provider of GEO_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4_000); // 4 s hard timeout

      const res = await fetch(provider.url, {
        signal: controller.signal,
        // Force no-cache so stale CDN responses don't re-deliver a prior error
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = (await res.json()) as Record<string, unknown>;
      const geo = provider.extract(json);

      if (geo && geo.country && geo.country !== "Unknown") {
        console.debug(`[useUserTracker] Geo resolved via ${provider.url}:`, geo);
        return geo;
      }
    } catch (err) {
      // AbortError (timeout) or network failure – try next provider
      console.warn(`[useUserTracker] Provider ${provider.url} failed:`, err);
    }
  }

  console.warn("[useUserTracker] All geo providers failed – using fallback.");
  return fallback;
}

// ─── Session Token Helpers ────────────────────────────────────────────────────
/**
 * FIX: Replaced `import { v4 as uuidv4 } from "uuid"` (not in package.json)
 * with the native `crypto.randomUUID()`. This API is available in all modern
 * browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and Vercel's Node runtime.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Polyfill for older environments — RFC 4122 v4 UUID
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
    // SSR / private-mode environments
    return generateUUID();
  }
}

// ─── Hash helper (for IP anonymisation) ──────────────────────────────────────
async function sha256Short(value: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  } catch {
    return "anon";
  }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
/**
 * useUserTracker
 *
 * Tracks the active user session in Supabase `user_sessions`.
 * - Upserts on mount with resolved country (Geo-IP failover chain).
 * - Sends a heartbeat every 30 s so `last_seen` stays current.
 * - Removes the session row on page unload.
 */
export function useUserTracker(currentPage: string) {
  const sessionToken = useRef<string>(getOrCreateSessionToken());
  const metaRef = useRef<SessionMeta | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Upsert session row ────────────────────────────────────────────────────
  async function upsertSession(page: string) {
    if (!metaRef.current) return;

    const { sessionToken: token, ...geo } = metaRef.current;

    const { error } = await supabase.from("user_sessions").upsert(
      {
        session_token: token,
        current_page: page,
        ...geo,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_token" }
    );

    if (error) {
      console.error("[useUserTracker] upsert error:", error.message);
    }
  }

  // ── Mount: resolve geo then upsert ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const geo = await resolveGeoData();
      const hashedIp = geo.ip ? await sha256Short(geo.ip) : "anon";

      if (cancelled) return;

      metaRef.current = {
        sessionToken: sessionToken.current,
        ...geo,
        ip: hashedIp, // Store hashed IP for privacy
      };

      // Initial upsert
      await upsertSession(currentPage);

      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        upsertSession(currentPage);
      }, HEARTBEAT_INTERVAL_MS);
    }

    init();

    // Cleanup on unmount / page close
    const handleUnload = () => {
      if (!metaRef.current) return;
      // Use sendBeacon for reliable fire-and-forget on unload
      navigator.sendBeacon(
        `/api/session-end?token=${metaRef.current.sessionToken}`
      );
      supabase
        .from("user_sessions")
        .delete()
        .eq("session_token", metaRef.current.sessionToken);
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
