// src/hooks/useUserTracker.ts
//
// ─── SINGLETON ARCHITECTURE ───────────────────────────────────────────────────
// Tracker state lives at MODULE scope — completely outside React.
// The heartbeat interval is never cleared by component unmounts or route changes.
//
// Wire-up in App.tsx / AppInner:
//   import { useUserTracker } from "@/hooks/useUserTracker";
//   import { useLocation }    from "wouter";
//   const [location] = useLocation();
//   useUserTracker(location);
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY           = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Module-level singleton ───────────────────────────────────────────────────
let _token   : string  | null = null;
let _country : string  | null = null;
let _page    : string         = "/";
let _ready   : boolean        = false;
let _interval: ReturnType<typeof setInterval> | null = null;
let _booted  : boolean        = false;

// ─── Geo resolution ───────────────────────────────────────────────────────────
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
  for (const p of GEO_PROVIDERS) {
    try {
      const ctrl    = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4_000);
      const res     = await fetch(p.url, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const json    = (await res.json()) as Record<string, unknown>;
      const country = p.extract(json);
      if (country) return country;
    } catch { /* try next */ }
  }
  return "Unknown";
}

// ─── Token ────────────────────────────────────────────────────────────────────
function resolveToken(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch { /* localStorage blocked */ }

  const fresh =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });

  try { localStorage.setItem(SESSION_KEY, fresh); } catch { /* ignore */ }
  return fresh;
}

// ─── Core DB write ────────────────────────────────────────────────────────────
async function pushSession(reason: string): Promise<void> {
  if (!isSupabaseEnabled || !_token) return;

  const now = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("user_sessions")
      .upsert(
        {
          session_token: _token,
          current_page:  _page,
          country:       _country ?? "Unknown",
          last_seen:     now,
          updated_at:    now,
        },
        { onConflict: "session_token" }
      )
      .select();

    if (!error) {
      _ready = true;
    }
    void reason; // suppress unused-var warning in production
  } catch { /* suppress — non-critical */ }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────
function startHeartbeat(): void {
  if (_interval !== null) return;
  _interval = setInterval(() => pushSession("heartbeat"), HEARTBEAT_INTERVAL_MS);
}

// ─── Boot (runs exactly once per browser session) ─────────────────────────────
async function boot(): Promise<void> {
  if (_booted) return;
  _booted = true;

  _token = resolveToken();

  // Immediate cold-start write so the row exists before geo resolves
  await pushSession("cold-start");

  // Resolve real country, then push again
  _country = await resolveCountry();
  await pushSession("geo-update");

  startHeartbeat();

  window.addEventListener("beforeunload", () => {
    if (!_token) return;
    try {
      navigator.sendBeacon("/api/session-end?token=" + _token);
      supabase.from("user_sessions").delete().eq("session_token", _token).then(() => {});
    } catch { /* expected on unload */ }
  });
}

// ─── Exported hook ────────────────────────────────────────────────────────────
export function useUserTracker(currentPage: string): void {
  _page = currentPage;

  useEffect(() => {
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    _page = currentPage;
    if (_ready) pushSession("page-change");
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps
}
