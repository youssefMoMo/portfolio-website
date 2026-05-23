// src/hooks/useUserTracker.ts
//
// ─── SINGLETON ARCHITECTURE ───────────────────────────────────────────────────
// The tracker state lives at MODULE scope — completely outside React.
// This means:
//   • The heartbeat interval is NEVER cleared by component unmounts / remounts.
//   • Route changes in wouter do not restart, re-init, or interrupt the loop.
//   • Calling useUserTracker() from any component just updates the page ref.
//   • The very first call immediately fires a DB write — no 30-second wait.
//
// HOW TO WIRE IT IN App.tsx (AppInner):
//   import { useUserTracker } from "@/hooks/useUserTracker";
//   import { useLocation } from "wouter";
//   ...
//   function AppInner() {
//     const [location] = useLocation();
//     useUserTracker(location);          // ← add this single line
//     ...
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY           = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Module-level singleton state ─────────────────────────────────────────────
// These live for the entire browser session — no React lifecycle can touch them.
let _token    : string  | null = null;   // session token (resolved once)
let _country  : string  | null = null;   // geo country   (resolved once)
let _page     : string         = "/";    // always the latest page
let _ready    : boolean        = false;  // true after first DB write succeeds
let _interval : ReturnType<typeof setInterval> | null = null;
let _booted   : boolean        = false;  // ensures boot() runs exactly once

// ─── Geo providers (tried in order) ──────────────────────────────────────────
const GEO_PROVIDERS: Array<{
  url: string;
  extract: (d: Record<string, unknown>) => string | null;
}> = [
  {
    url: "https://ipapi.co/json/",
    extract: (d) => {
      const c = String(d.country_name || "").trim();
      return c && c !== "undefined" ? c : null;
    },
  },
  {
    url: "https://ipwho.is/",
    extract: (d) => {
      if (!d.success) return null;
      const c = String(d.country || "").trim();
      return c || null;
    },
  },
  {
    url: "http://ip-api.com/json/?fields=status,country",
    extract: (d) => {
      if (String(d.status) !== "success") return null;
      const c = String(d.country || "").trim();
      return c || null;
    },
  },
];

async function resolveCountry(): Promise<string> {
  console.log("[Tracker Geo] Resolving country...");
  for (const p of GEO_PROVIDERS) {
    try {
      const ctrl    = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4_000);
      const res     = await fetch(p.url, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json    = (await res.json()) as Record<string, unknown>;
      const country = p.extract(json);
      if (country) {
        console.log("[Tracker Geo] ✅ Country:", country, "via", p.url);
        return country;
      }
    } catch (err) {
      console.log("[Tracker Geo] Provider failed:", p.url, err);
    }
  }
  console.warn("[Tracker Geo] ⚠️ All providers failed — using Unknown");
  return "Unknown";
}

// ─── Token helper ─────────────────────────────────────────────────────────────
function resolveToken(): string {
  console.log("[Tracker Init] Checking localStorage for key:", SESSION_KEY);
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && stored.trim()) {
      console.log("[Tracker Init] ✅ Found existing token:", stored.slice(0, 8) + "...");
      return stored.trim();
    }
  } catch { /* localStorage blocked */ }

  // Generate fresh
  const fresh =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });

  try { localStorage.setItem(SESSION_KEY, fresh); } catch { /* ignore */ }
  console.log("[Tracker Init] 🆕 New token generated:", fresh.slice(0, 8) + "...");
  return fresh;
}

// ─── Core DB write ────────────────────────────────────────────────────────────
// Single function handles both INSERT (new) and UPSERT (returning).
// Always called with the latest _page and _country values from module scope.
async function pushSession(reason: string): Promise<void> {
  if (!isSupabaseEnabled) {
    console.error("[Tracker Error] ❌ isSupabaseEnabled is false — env vars missing?");
    return;
  }
  if (!_token) {
    console.error("[Tracker Error] ❌ pushSession called before token resolved");
    return;
  }

  const now = new Date().toISOString();
  const country = _country ?? "Unknown";

  console.log(
    `[Tracker Push] (${reason}) token: ${_token.slice(0, 8)}... | page: ${_page} | country: ${country} | now: ${now}`
  );

  try {
    const { data, error } = await supabase
      .from("user_sessions")
      .upsert(
        {
          session_token: _token,
          current_page:  _page,
          country,
          last_seen:     now,
          updated_at:    now,
        },
        { onConflict: "session_token" }
      )
      .select();   // forces PostgREST to confirm the write returned data

    if (error) {
      console.error(
        "[Tracker Error] ❌ DB write failed:",
        error.message,
        "| code:", error.code,
        "| details:", error.details,
        "| hint:", error.hint,
        "| full:", JSON.stringify(error, null, 2)
      );
    } else {
      _ready = true;
      console.log(
        `[Tracker Push] ✅ (${reason}) success — row:`,
        JSON.stringify(data, null, 2)
      );
    }
  } catch (err) {
    console.error(
      "[Tracker Error] ❌ Exception during DB write:",
      err,
      JSON.stringify(err, Object.getOwnPropertyNames(err as object))
    );
  }
}

// ─── Heartbeat loop ───────────────────────────────────────────────────────────
// Starts once, runs forever. Never re-created, never cleared by React.
function startHeartbeat(): void {
  if (_interval !== null) return;  // already running
  console.log("[Tracker Init] ⏰ Starting heartbeat every", HEARTBEAT_INTERVAL_MS / 1000, "s");
  _interval = setInterval(() => {
    console.log("[Tracker Heartbeat] ⏰ Interval fired — page:", _page);
    pushSession("heartbeat");
  }, HEARTBEAT_INTERVAL_MS);
}

// ─── Boot — runs exactly once per browser session ─────────────────────────────
async function boot(): Promise<void> {
  if (_booted) return;
  _booted = true;

  console.log("[Tracker Init] 🟢 BOOT START");
  console.log("[Tracker Status] isSupabaseEnabled:", isSupabaseEnabled);

  // 1. Resolve token synchronously from localStorage
  _token = resolveToken();

  // 2. Fire the FIRST write immediately with whatever country we have (Unknown)
  //    so the row hits the DB right now, not after the geo round-trip.
  console.log("[Tracker Init] Firing immediate cold-start push (country=Unknown placeholder)...");
  await pushSession("cold-start");

  // 3. Resolve country async, then push again with the real value
  _country = await resolveCountry();
  console.log("[Tracker Init] Country resolved — pushing updated row...");
  await pushSession("geo-update");

  // 4. Start the heartbeat loop (survives all remounts)
  startHeartbeat();

  // 5. Best-effort cleanup on tab close
  window.addEventListener("beforeunload", () => {
    if (!_token) return;
    console.log("[Tracker Unload] Sending beacon for token:", _token.slice(0, 8) + "...");
    try {
      navigator.sendBeacon("/api/session-end?token=" + _token);
      // Fire-and-forget delete (may not complete before unload — that's OK)
      supabase.from("user_sessions").delete().eq("session_token", _token).then(() => {});
    } catch { /* expected on unload */ }
  });

  console.log("[Tracker Init] 🏁 BOOT COMPLETE");
}

// ─── Exported hook ────────────────────────────────────────────────────────────
// Call this once inside AppInner with the current wouter location.
// It is safe to call from any depth — boot() is idempotent.
export function useUserTracker(currentPage: string): void {
  // Always keep the module-level page ref in sync — the heartbeat closure
  // reads _page directly so it never captures a stale route.
  _page = currentPage;

  useEffect(() => {
    // Boot the singleton (no-op on every call after the first)
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On every page navigation, push immediately so the admin sees the new
  // route in real time — the heartbeat alone would take up to 30 s.
  useEffect(() => {
    _page = currentPage;
    if (!_ready) {
      // Boot hasn't finished yet — boot() will push the correct page anyway
      console.log("[Tracker Nav] Page changed to", currentPage, "— boot still in progress, skipping immediate push");
      return;
    }
    console.log("[Tracker Nav] 📍 Page changed to:", currentPage, "— pushing immediately");
    pushSession("page-change");
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps
}
