// ═══════════════════════════════════════════════════════════════
// USER TRACKER HOOK — PRODUCTION REFACTOR
// src/hooks/useUserTracker.ts
//
// Changelog vs. original:
//   [FIX-13] Eliminated module-level global variables (_token,
//            _country, _page, _ready, _interval, _booted).
//            All mutable state is now held inside the hook via
//            useRef, which is fully encapsulated per mount and
//            supports isolated multi-component reuse without
//            cross-contamination.
//   [FIX-14] Removed the async supabase.delete() call from the
//            beforeunload handler. Async calls initiated during
//            unload are silently dropped by browsers. Relying on
//            token expiration lifetimes via DB TTL is the correct
//            approach. sendBeacon is retained for server-side
//            accounting if the endpoint exists.
//   [FIX-15] Consolidated the boot() workflow into a single
//            atomic upsert: the cold-start row is written only
//            after the country has fully resolved. This replaces
//            the original double pushSession("cold-start") +
//            pushSession("geo-update") sequence with one DB
//            round-trip containing complete data.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Geo Resolution ───────────────────────────────────────────────────────────

interface GeoProvider {
  url: string;
  extract: (d: Record<string, unknown>) => string | null;
}

const GEO_PROVIDERS: GeoProvider[] = [
  {
    url: "https://ipapi.co/json/",
    extract: (d) => {
      const c = String(d.country_name ?? "").trim();
      return c && c !== "undefined" ? c : null;
    },
  },
  {
    url: "https://ipwho.is/",
    extract: (d) => {
      if (!d.success) return null;
      const c = String(d.country ?? "").trim();
      return c || null;
    },
  },
  {
    url: "http://ip-api.com/json/?fields=status,country",
    extract: (d) => {
      if (String(d.status) !== "success") return null;
      const c = String(d.country ?? "").trim();
      return c || null;
    },
  },
];

async function resolveCountry(): Promise<string> {
  for (const provider of GEO_PROVIDERS) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4_000);
      const res = await fetch(provider.url, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const country = provider.extract(json);
      if (country) return country;
    } catch {
      /* try next provider */
    }
  }
  return "Unknown";
}

// ─── Token ────────────────────────────────────────────────────────────────────

function resolveToken(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored?.trim()) return stored.trim();
  } catch {
    /* localStorage blocked */
  }

  const fresh =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });

  try {
    localStorage.setItem(SESSION_KEY, fresh);
  } catch {
    /* ignore */
  }
  return fresh;
}

// ─── Tracker State Interface ──────────────────────────────────────────────────
// [FIX-13] All previously module-level mutable variables are encapsulated here.

interface TrackerState {
  token: string | null;
  country: string | null;
  page: string;
  ready: boolean;
  interval: ReturnType<typeof setInterval> | null;
  booted: boolean;
}

// ─── DB Write ─────────────────────────────────────────────────────────────────

async function pushSession(
  state: TrackerState,
  reason: string
): Promise<void> {
  if (!isSupabaseEnabled || !state.token) return;

  const now = new Date().toISOString();
  try {
    await supabase
      .from("user_sessions")
      .upsert(
        {
          session_token: state.token,
          current_page: state.page,
          country: state.country ?? "Unknown",
          last_seen: now,
          updated_at: now,
        },
        { onConflict: "session_token" }
      )
      .select();

    state.ready = true;
    void reason; // suppress unused-var lint in production builds
  } catch {
    /* suppress — non-critical */
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function startHeartbeat(state: TrackerState): void {
  if (state.interval !== null) return;
  state.interval = setInterval(
    () => void pushSession(state, "heartbeat"),
    HEARTBEAT_INTERVAL_MS
  );
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

/**
 * [FIX-15] Single atomic upsert: resolves country first, then writes one
 * complete row. Replaces the original double pushSession calls.
 *
 * [FIX-14] beforeunload uses only navigator.sendBeacon. The async Supabase
 * delete that previously failed silently on tab close is removed.
 */
async function boot(state: TrackerState): Promise<void> {
  if (state.booted) return;
  state.booted = true;

  state.token = resolveToken();

  // [FIX-15] Resolve country before writing to the DB so a single upsert
  // contains complete data — no "cold-start" placeholder row needed.
  state.country = await resolveCountry();
  await pushSession(state, "initial");

  startHeartbeat(state);

  // [FIX-14] Only sendBeacon on unload; async DB delete removed because
  // browsers terminate async tasks immediately during beforeunload.
  window.addEventListener("beforeunload", () => {
    if (!state.token) return;
    try {
      navigator.sendBeacon("/api/session-end?token=" + state.token);
    } catch {
      /* sendBeacon is best-effort */
    }
    // Session row is left in place. DB-side TTL / expiry handles cleanup.
  });
}

// ─── Exported Hook ────────────────────────────────────────────────────────────

/**
 * useUserTracker
 *
 * Tracks the user's current page and session in Supabase.
 * Safe to mount in multiple components simultaneously — all mutable
 * state is encapsulated inside a per-mount ref [FIX-13].
 *
 * @param currentPage - The current route/path string (e.g. from useLocation())
 *
 * @example
 * import { useUserTracker } from "@/hooks/useUserTracker";
 * import { useLocation }    from "wouter";
 * const [location] = useLocation();
 * useUserTracker(location);
 */
export function useUserTracker(currentPage: string): void {
  // [FIX-13] All tracker state lives in a ref — fully isolated per hook instance.
  const stateRef = useRef<TrackerState>({
    token: null,
    country: null,
    page: currentPage,
    ready: false,
    interval: null,
    booted: false,
  });

  // Boot exactly once per hook mount
  useEffect(() => {
    void boot(stateRef.current);

    return () => {
      // Cleanup heartbeat interval on unmount
      if (stateRef.current.interval !== null) {
        clearInterval(stateRef.current.interval);
        stateRef.current.interval = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track page changes
  useEffect(() => {
    stateRef.current.page = currentPage;
    if (stateRef.current.ready) {
      void pushSession(stateRef.current, "page-change");
    }
  }, [currentPage]);
}
