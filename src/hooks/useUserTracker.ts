import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoData {
  country: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

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
    url: "http://ip-api.com/json/?fields=status,country",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country || "").trim();
      if (!country) return null;
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
];

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
      if (geo && geo.country && geo.country !== "Unknown") return geo;
    } catch {
      // Try next provider
    }
  }

  return fallback;
}

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

// ── VPN FIX: localStorage persists across page reloads and IP changes.
//   sessionStorage was cleared on reload — VPN users who refreshed got a new
//   token, breaking the realtime channel subscription in App.tsx. ──
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

export function useUserTracker(currentPage: string) {
  const sessionToken = useRef<string>(getOrCreateSessionToken());
  const metaRef = useRef<SessionMeta | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function upsertSession(page: string) {
    if (!metaRef.current) return;
    try {
      const { error } = await supabase.from("user_sessions").upsert(
        {
          session_token: metaRef.current.sessionToken,
          current_page: page,
          country: metaRef.current.country,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
          "/api/session-end?token=" + metaRef.current.sessionToken
        );
        supabase
          .from("user_sessions")
          .delete()
          .eq("session_token", metaRef.current.sessionToken)
          .then(() => {});
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

  useEffect(() => {
    if (!metaRef.current) return;
    upsertSession(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
}
