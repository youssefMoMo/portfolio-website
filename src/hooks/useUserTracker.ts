// src/hooks/useUserTracker.ts
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
const SESSION_KEY           = "youssef_session_token"; // must match App.tsx
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

// ─── Session token helpers ────────────────────────────────────────────────────
// Returns { token, isNew }
// isNew = true  → brand-new visitor; caller MUST hard-INSERT
// isNew = false → returning visitor; caller can upsert / heartbeat
function getOrCreateSessionToken(): { token: string; isNew: boolean } {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return { token: existing, isNew: false };

    const fresh = generateUUID();
    localStorage.setItem(SESSION_KEY, fresh);
    return { token: fresh, isNew: true };
  } catch {
    // localStorage blocked (private mode / storage quota) → treat as new
    return { token: generateUUID(), isNew: true };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUserTracker(currentPage: string) {
  // Stable token ref — never changes for the lifetime of the tab.
  // Also records whether this was a brand-new visitor at mount time.
  const sessionInfoRef = useRef<{ token: string; isNew: boolean }>(
    getOrCreateSessionToken()
  );

  // metaRef holds geo data once resolved
  const metaRef = useRef<SessionMeta | null>(null);

  // Always read the LATEST page from the heartbeat closure
  const currentPageRef = useRef<string>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialisedRef = useRef(false);

  // ── Hard INSERT — used ONLY for brand-new visitors ────────────────────────
  // This is a guaranteed first-time write that Supabase cannot silently skip.
  // It fires even if there is a conflict on session_token (DO NOTHING), which
  // handles the edge case of localStorage being cleared mid-session.
  async function hardInsertSession(page: string): Promise<void> {
    if (!isSupabaseEnabled) return;
    if (!metaRef.current)   return;

    const now = new Date().toISOString();

    const { error } = await supabase.from("user_sessions").insert({
      session_token: metaRef.current.sessionToken,
      current_page:  page,
      country:       metaRef.current.country,
      last_seen:     now,
      updated_at:    now,
    });

    if (error) {
      // "23505" = unique_violation — row already exists (race / double-mount).
      // Not fatal — fall through to the heartbeat upsert loop.
      if (error.code !== "23505") {
        console.warn("[useUserTracker] hard INSERT failed:", error.message, error.code);
      }
    }
  }

  // ── Upsert — used for heartbeats and returning visitors ──────────────────
  async function upsertSession(page: string): Promise<void> {
    if (!isSupabaseEnabled) return;
    if (!metaRef.current)   return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("user_sessions")
      .upsert(
        {
          session_token: metaRef.current.sessionToken,
          current_page:  page,
          country:       metaRef.current.country,
          last_seen:     now,
          updated_at:    now,
        },
        { onConflict: "session_token" }
      );

    if (error) {
      console.warn("[useUserTracker] upsert warning:", error.message);
    }
  }

  // ── Initialise once: resolve geo → write row → start heartbeat ────────────
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        const geo = await resolveGeoData();
        if (cancelled) return;

        metaRef.current = {
          sessionToken: sessionInfoRef.current.token,
          country:      geo.country,
        };

        // ── CRITICAL BRANCH ────────────────────────────────────────────────
        // Brand-new visitor → hard INSERT to guarantee the row lands.
        // Returning visitor  → upsert so we refresh last_seen without dupes.
        if (sessionInfoRef.current.isNew) {
          await hardInsertSession(currentPageRef.current);
        } else {
          await upsertSession(currentPageRef.current);
        }

        // Heartbeat — always upsert; row is guaranteed to exist by this point
        heartbeatTimer.current = setInterval(() => {
          upsertSession(currentPageRef.current);
        }, HEARTBEAT_INTERVAL_MS);

      } catch (err) {
        console.warn("[useUserTracker] init exception (suppressed):", err);
      }
    }

    init();

    // Best-effort cleanup on tab close
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
  useEffect(() => {
    if (!metaRef.current) return; // geo not resolved yet — heartbeat will catch it
    upsertSession(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
}
