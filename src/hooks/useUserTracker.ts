import { useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoData {
  country: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY          = "youssef_session_token"; // must match App.tsx
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Geo providers (tried in order, first success wins) ──────────────────────
const GEO_PROVIDERS: Array<{
  url: string;
  extract: (data: Record<string, unknown>) => GeoData | null;
}> = [
  {
    url: "https://ipapi.co/json/",
    extract(data) {
      const country = String(data.country_name || "").trim();
      if (!country || country === "undefined") return null;
      return { country };
    },
  },
  {
    url: "https://ipwho.is/",
    extract(data) {
      if (!data.success) return null;
      const country = String(data.country || "").trim();
      if (!country) return null;
      return { country };
    },
  },
  {
    url: "http://ip-api.com/json/?fields=status,country",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country || "").trim();
      if (!country) return null;
      return { country };
    },
  },
];

async function resolveGeoData(): Promise<GeoData> {
  for (const provider of GEO_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 4_000);
      const res        = await fetch(provider.url, {
        signal: controller.signal,
        cache:  "no-store",
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const geo  = provider.extract(json);
      if (geo && geo.country && geo.country !== "Unknown") return geo;
    } catch {
      // try next provider
    }
  }
  return { country: "Unknown" };
}

// ─── UUID ─────────────────────────────────────────────────────────────────────
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

// VPN-safe: localStorage survives IP changes; sessionStorage does not.
function getOrCreateSessionToken(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = generateUUID();
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return generateUUID();
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUserTracker(currentPage: string) {
  // Stable token ref — never changes for the lifetime of the tab
  const sessionTokenRef = useRef<string>(getOrCreateSessionToken());

  // metaRef holds geo data once resolved
  const metaRef = useRef<SessionMeta | null>(null);

  // ── KEY FIX: store currentPage in a ref so the heartbeat closure always
  //    reads the LATEST value, not the one captured at mount time.
  const currentPageRef = useRef<string>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialisedRef = useRef(false);

  // ── Core upsert — writes all tracked columns to user_sessions ─────────────
  async function upsertSession(page: string): Promise<void> {
    if (!isSupabaseEnabled) return;
    if (!metaRef.current)   return;

    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from("user_sessions")
        .upsert(
          {
            session_token: metaRef.current.sessionToken,  // PK / conflict target
            current_page:  page,
            country:       metaRef.current.country,
            last_seen:     now,
            updated_at:    now,                           // admin useNow() reads this
          },
          { onConflict: "session_token" }
        );

      if (error) {
        console.warn("[useUserTracker] upsert warning:", error.message);
      }
    } catch (err) {
      console.warn("[useUserTracker] upsert exception (suppressed):", err);
    }
  }

  // ── Initialise once: resolve geo, write first row, start heartbeat ─────────
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        const geo = await resolveGeoData();
        if (cancelled) return;

        metaRef.current = {
          sessionToken: sessionTokenRef.current,
          country:      geo.country,
        };

        // First write — establishes the row in user_sessions
        await upsertSession(currentPageRef.current);

        // Heartbeat — reads currentPageRef.current so it's ALWAYS up-to-date
        heartbeatTimer.current = setInterval(() => {
          upsertSession(currentPageRef.current);
        }, HEARTBEAT_INTERVAL_MS);

      } catch (err) {
        console.warn("[useUserTracker] init exception (suppressed):", err);
      }
    }

    init();

    // Clean up on tab close: delete the row so the admin list self-prunes
    const handleUnload = () => {
      if (!metaRef.current) return;
      try {
        // sendBeacon is fire-and-forget — best effort
        navigator.sendBeacon(
          "/api/session-end?token=" + metaRef.current.sessionToken
        );
        // Also attempt a direct Supabase delete (may not complete before unload)
        supabase
          .from("user_sessions")
          .delete()
          .eq("session_token", metaRef.current.sessionToken)
          .then(() => {});
      } catch {
        // Suppress — unload errors are expected
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cancelled = true;
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      window.removeEventListener("beforeunload", handleUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: runs once on mount

  // ── Page-change effect: immediately update current_page on navigation ──────
  // Fires whenever wouter changes the route. If init hasn't finished yet,
  // currentPageRef is already updated above so the first upsert will use
  // the correct page automatically.
  useEffect(() => {
    if (!metaRef.current) return; // geo not resolved yet — heartbeat will catch it
    upsertSession(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
}
