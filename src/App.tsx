import { useEffect, useState, useCallback } from "react";
import { Switch, Route } from "wouter";
import { supabase, isSupabaseEnabled } from "./lib/supabase";
import { ThemeProvider } from "./hooks/use-theme";
import { LanguageProvider } from "./hooks/use-language";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home          from "./pages/Home";
import Portfolio     from "./pages/Portfolio";
import Games         from "./pages/Games";
import Pricing       from "./pages/Pricing";
import Reviews       from "./pages/Reviews";
import Policies      from "./pages/Policies";
import AdminLogin    from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound      from "./pages/not-found";

// ─── Helpers (pure functions — no hooks, no context) ──────────────────────────
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

const SESSION_STORAGE_KEY = "youssef_session_token";

function getOrCreateSessionToken(): string {
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return generateUUID();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AlertState { id: string; message: string; }
interface BanState   { reason: string; }

// ─── Alert Banner — z-index 99999, inline style only ─────────────────────────
// NOTE: This component is pure UI. It does NOT call useTheme / useLanguage.
function AlertBanner({
  alert,
  onDismiss,
}: {
  alert: AlertState;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 99999 }}
    >
      <div className="w-full bg-yellow-400 text-black flex items-center justify-between px-4 py-3 shadow-2xl border-b-4 border-yellow-600">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
          </span>
          <p className="font-bold text-sm sm:text-base truncate">{alert.message}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="ml-4 shrink-0 text-black/70 hover:text-black transition-colors text-xl leading-none font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Ban Overlay — z-index 999999, full blackout, unbypassable ────────────────
// NOTE: This component is pure UI. It does NOT call useTheme / useLanguage.
function BanOverlay({ reason }: { reason: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      tabIndex={-1}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-lg">
        <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
          You Have Been Banned
        </h1>
        {reason && reason.trim() !== "" ? (
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 w-full">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Reason</p>
            <p className="text-white text-base font-medium">{reason}</p>
          </div>
        ) : (
          <p className="text-white/50 text-sm">No reason was provided.</p>
        )}
        <p className="text-white/30 text-xs">
          If you believe this is a mistake, contact support via Discord.
        </p>
      </div>
    </div>
  );
}

// ─── AppInner ─────────────────────────────────────────────────────────────────
// Every hook, subscription, banner, and route lives here.
// This component is ALWAYS rendered inside ThemeProvider + LanguageProvider,
// so every child (Layout, Navbar, Footer) can safely call useTheme/useLanguage.
function AppInner() {
  const [sessionToken] = useState<string>(getOrCreateSessionToken);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [ban,   setBan]   = useState<BanState   | null>(null);

  // ── Ban check on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_sessions")
          .select("is_banned, ban_reason")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (data?.is_banned) setBan({ reason: data.ban_reason ?? "" });
      } catch { /* non-critical */ }
    })();
  }, [sessionToken]);

  // ── Active alert check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("site_alerts")
          .select("id, message")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.message) setAlert({ id: data.id, message: data.message });
      } catch { /* non-critical */ }
    })();
  }, []);

  // ── Realtime: ban / unban ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const ch = supabase
      .channel(`session:${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_sessions",
          filter: `session_token=eq.${sessionToken}`,
        },
        (payload) => {
          const row = payload.new as { is_banned?: boolean; ban_reason?: string };
          if (row.is_banned === true)  setBan({ reason: row.ban_reason ?? "" });
          if (row.is_banned === false) setBan(null);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionToken]);

  // ── Realtime: global site alerts ─────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const ch = supabase
      .channel("global:site_alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_alerts" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setAlert((prev) =>
              prev?.id === (payload.old as { id: string }).id ? null : prev
            );
            return;
          }
          const row = payload.new as { id: string; message: string; active: boolean };
          if (row.active && row.message) setAlert({ id: row.id, message: row.message });
          else setAlert((prev) => (prev?.id === row.id ? null : prev));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dismissAlert = useCallback(() => setAlert(null), []);

  const showBanner = !ban && alert !== null;

  return (
    <>
      {/* ── Ban overlay: rendered first so nothing can paint above it ───── */}
      {ban !== null && <BanOverlay reason={ban.reason} />}

      {/* ── Alert banner: fixed top bar above all page content ───────────── */}
      {showBanner && <AlertBanner alert={alert!} onDismiss={dismissAlert} />}

      {/* ── Page content: offset by banner height when banner is visible ─── */}
      <div style={showBanner ? { paddingTop: "48px" } : undefined}>
        <Switch>
          <Route path="/">
            <Layout><Home /></Layout>
          </Route>
          <Route path="/portfolio">
            <Layout><Portfolio /></Layout>
          </Route>
          <Route path="/games">
            <Layout><Games /></Layout>
          </Route>
          <Route path="/pricing">
            <Layout><Pricing /></Layout>
          </Route>
          <Route path="/reviews">
            <Layout><Reviews /></Layout>
          </Route>
          <Route path="/policies">
            <Layout><Policies /></Layout>
          </Route>
          <Route path="/admin">
            <AdminLogin />
          </Route>
          <Route path="/admin/dashboard">
            <ProtectedRoute><AdminDashboard /></ProtectedRoute>
          </Route>
          <Route>
            <Layout><NotFound /></Layout>
          </Route>
        </Switch>
      </div>
    </>
  );
}

// ─── App (default export) ─────────────────────────────────────────────────────
// ⚠  This function contains ONLY provider wrappers.
// ⚠  No hooks. No state. No logic. No JSX other than providers + AppInner.
export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="youssef-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="yd_language">
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}
