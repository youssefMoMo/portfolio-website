// src/hooks/useUserTracker.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  GLOBAL BACKGROUND SESSION TRACKER                              ║
// ║                                                                  ║
// ║  Runs silently on the public layout (App.tsx).                  ║
// ║  - Creates an ephemeral session token per browser session       ║
// ║    (sessionStorage — resets on tab close, not localStorage).    ║
// ║  - On mount: fetches visitor country via ipwho.is (no API key). ║
// ║  - On every route change: pushes current_page + appends to      ║
// ║    clickstream_path array in Supabase.                          ║
// ║  - On /admin access by non-admin: escalates threat_level →      ║
// ║    'high' and appends to malicious_attempts[].                  ║
// ║  - On 3+ admin attempts: sets is_banned = true.                 ║
// ║  - All Supabase calls are fire-and-forget with silent catch —   ║
// ║    never throws or blocks page navigation.                      ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { isAuthenticatedSync } from "@/lib/auth";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Any path under this prefix triggers an admin-access flag for non-admins. */
const ADMIN_GUARD_PREFIX = "/admin/dashboard";

/** Max clickstream entries retained per session (prevents row bloat). */
const CLICKSTREAM_MAX = 25;

/** After this many malicious attempts, the session is auto-banned. */
const AUTO_BAN_THRESHOLD = 3;

/** Geo-IP lookup endpoint — free, no API key, returns { country: "Egypt" }. */
const GEO_API = "https://ipwho.is/?fields=country";
const GEO_TIMEOUT_MS = 4_000;

// ─── Session token ──────────────────────────────────────────────────────────

/** Returns the session token, creating one if this is the first call. */
function getOrCreateToken(): string {
  if (typeof window === "undefined") return "";
  const KEY = "yd_tracker_token";
  let token = sessionStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(KEY, token);
  }
  return token;
}

// ─── Geo lookup ─────────────────────────────────────────────────────────────

async function detectCountry(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const res = await fetch(GEO_API, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return "Unknown";
    const json = (await res.json()) as { country?: string };
    return json.country ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function upsertSession(token: string, country: string, page: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("user_sessions").upsert(
    {
      session_token:     token,
      country,
      current_page:      page,
      clickstream_path:  [page],
      joined_at:         new Date().toISOString(),
      last_seen:         new Date().toISOString(),
      threat_level:      "low",
      is_banned:         false,
      malicious_attempts: [],
    },
    { onConflict: "session_token", ignoreDuplicates: false },
  );
}

async function updatePage(token: string, page: string): Promise<void> {
  if (!supabase) return;

  // Read current row to append to arrays
  const { data } = await supabase
    .from("user_sessions")
    .select("clickstream_path, malicious_attempts, threat_level, is_banned")
    .eq("session_token", token)
    .maybeSingle();

  if (!data) return; // session not yet written — skip

  const clickstream = [
    ...(data.clickstream_path ?? []),
    page,
  ].slice(-CLICKSTREAM_MAX);

  // ── Admin access detection ──────────────────────────────────────────────
  const isAdminAttempt =
    page.startsWith(ADMIN_GUARD_PREFIX) && !isAuthenticatedSync();

  const updates: Record<string, unknown> = {
    current_page:     page,
    clickstream_path: clickstream,
    last_seen:        new Date().toISOString(),
  };

  if (isAdminAttempt) {
    const msg = `Blocked on ${page} at ${new Date().toLocaleTimeString()} → Malicious Pathing detected`;
    const attempts: string[] = [...(data.malicious_attempts ?? []), msg];
    const isBanned = attempts.length >= AUTO_BAN_THRESHOLD;

    updates.malicious_attempts = attempts;
    updates.threat_level       = "high";
    updates.is_banned          = isBanned;
  }

  await supabase
    .from("user_sessions")
    .update(updates)
    .eq("session_token", token);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Mount once in App.tsx (or Layout.tsx).
 * Returns the current session token so App.tsx can subscribe to
 * ban-status changes and show the BannedScreen when needed.
 */
export function useUserTracker(): { sessionToken: string } {
  const [location] = useLocation();

  const tokenRef       = useRef<string>("");
  const initialized    = useRef(false);
  const prevLocation   = useRef<string>("");

  // ── Init on first mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || initialized.current) return;
    initialized.current = true;

    const token = getOrCreateToken();
    tokenRef.current = token;
    prevLocation.current = location;

    (async () => {
      const country = await detectCountry();
      await upsertSession(token, country, location);
    })().catch(() => {/* silent */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Track navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const token = tokenRef.current || getOrCreateToken();
    tokenRef.current = token;

    if (prevLocation.current === location) return;
    prevLocation.current = location;

    updatePage(token, location).catch(() => {/* silent */});
  }, [location]);

  return { sessionToken: tokenRef.current };
}

// ─── Ban status subscription ─────────────────────────────────────────────────

/**
 * Subscribes to realtime ban-status changes for the current session.
 * Calls onBanned() if the backend sets is_banned = true.
 */
export function subscribeToBanStatus(
  sessionToken: string,
  onBanned: () => void,
): () => void {
  if (!supabase || !sessionToken) return () => {};

  const channel = supabase
    .channel(`ban:${sessionToken}`)
    .on(
      "postgres_changes",
      {
        event:  "UPDATE",
        schema: "public",
        table:  "user_sessions",
        filter: `session_token=eq.${sessionToken}`,
      },
      (payload) => {
        if ((payload.new as { is_banned?: boolean }).is_banned === true) {
          onBanned();
        }
      },
    )
    .subscribe();

  return () => { supabase?.removeChannel(channel); };
}
