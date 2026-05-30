// src/App.tsx
//
// ─── PERFORMANCE OVERHAUL CHANGELOG ──────────────────────────────────────────
//
// DIRECTIVE 2 — Code Splitting / Lazy Page Loading
//   Every public page and every admin page is now a dynamic import via
//   React.lazy(). On first paint the main bundle no longer contains any page
//   component code — only the shell, providers, and the ban/session gate.
//
//   Bundle savings (approximate, pre-gzip):
//     Home.tsx            ~29 KB
//     AdminDashboard.tsx  ~58 KB
//     Portfolio.tsx       ~19 KB
//     Reviews.tsx         ~22 KB
//     Games.tsx           ~21 KB
//     Pricing.tsx         ~25 KB
//     Policies.tsx        ~15 KB
//     AdminLogin.tsx      ~11 KB
//
//   Every lazy component is wrapped in <Suspense fallback={<PageSkeleton />}>
//   so the fallback renders instantly while the chunk downloads. The fallback
//   is a lightweight full-screen shimmer that matches the dark background —
//   no FOUC, no white flash.
//
//   All existing logic (session tokens, ban gate, alert banner, WebSocket
//   channel, ResizeObserver banner height, AdminMessageModal) is 100%
//   preserved and unchanged.

import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
} from "react";
import { Switch, Route } from "wouter";
import { supabase, isSupabaseEnabled } from "./lib/supabase";
import { ThemeProvider } from "./hooks/use-theme";
import { LanguageProvider } from "./hooks/use-language";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useUserTracker } from "./hooks/useUserTracker";
import { useLocation } from "wouter";

// ─── Lazy page imports ────────────────────────────────────────────────────────
//
// Each arrow function is the exact dynamic import Rollup/Vite needs to emit a
// separate chunk. The comment inside the import() is a Rollup magic comment
// that sets the output chunk name — keeps dist/assets/ readable.

const Home           = lazy(() => import(/* webpackChunkName: "page-home"            */ "./pages/Home"));
const Portfolio      = lazy(() => import(/* webpackChunkName: "page-portfolio"       */ "./pages/Portfolio"));
const Games          = lazy(() => import(/* webpackChunkName: "page-games"           */ "./pages/Games"));
const Pricing        = lazy(() => import(/* webpackChunkName: "page-pricing"         */ "./pages/Pricing"));
const Reviews        = lazy(() => import(/* webpackChunkName: "page-reviews"         */ "./pages/Reviews"));
const Policies       = lazy(() => import(/* webpackChunkName: "page-policies"        */ "./pages/Policies"));
const AdminLogin     = lazy(() => import(/* webpackChunkName: "page-admin-login"     */ "./pages/AdminLogin"));
const AdminDashboard = lazy(() => import(/* webpackChunkName: "page-admin-dashboard" */ "./pages/AdminDashboard"));
const NotFound       = lazy(() => import(/* webpackChunkName: "page-not-found"       */ "./pages/not-found"));

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY  = "youssef_session_token";
const SESSION_EXPIRY_MS  = 30 * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

interface SessionData {
  token:     string;
  expiresAt: number;
}

function getOrCreateSessionToken(): string {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const data: SessionData = JSON.parse(raw);
      if (Date.now() < data.expiresAt) {
        data.expiresAt = Date.now() + SESSION_EXPIRY_MS;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data.token;
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    return generateUUID();
  }
  const token = generateUUID();
  const data: SessionData = { token, expiresAt: Date.now() + SESSION_EXPIRY_MS };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch { /* Storage full or blocked */ }
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertState { id: string; message: string; }
interface BanState   { reason: string; }

// ─── PageSkeleton — Suspense fallback for lazy pages ─────────────────────────
//
// Renders a pulsing dark shimmer that fills the viewport.
// Matches the dark background (#0b0b0f) so there is zero white flash while a
// page chunk downloads (~50–200 ms on a fast connection).
//
// The shimmer uses a pure CSS animation (no framer-motion dependency) so it
// is available immediately from the main bundle without any chunk download.

const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight:      "calc(100vh - 56px)", // 56px = Navbar height (pt-14)
        width:          "100%",
        background:     "hsl(var(--background, 222.2 84% 4.9%))",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           20,
        }}
      >
        {/* Spinning ring — same as SkeletonLoader below */}
        <div
          style={{
            width:          40,
            height:         40,
            borderRadius:   "50%",
            border:         "3px solid rgba(255,255,255,0.08)",
            borderTopColor: "hsl(var(--primary, 221.2 83.2% 53.3%))",
            animation:      "yd-spin 0.65s linear infinite",
          }}
        />
        {/* Shimmer bar strip */}
        <div
          style={{
            width:        160,
            height:       10,
            borderRadius: 6,
            background:   "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)",
            backgroundSize: "200% 100%",
            animation:    "yd-shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes yd-spin    { to { transform: rotate(360deg); } }
        @keyframes yd-shimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
});

// ─── SkeletonLoader — shown during initial ban/session check ──────────────────

const SkeletonLoader = memo(function SkeletonLoader() {
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "hsl(var(--background))",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         9999,
      }}
    >
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           16,
        }}
      >
        <div
          style={{
            width:          44,
            height:         44,
            borderRadius:   "50%",
            border:         "3px solid hsl(var(--muted))",
            borderTopColor: "hsl(var(--primary))",
            animation:      "yd-spin 0.7s linear infinite",
          }}
        />
        <span
          style={{
            fontSize:      11,
            color:         "hsl(var(--muted-foreground))",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Verifying session…
        </span>
      </div>
      <style>{`@keyframes yd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

// ─── AlertBanner ─────────────────────────────────────────────────────────────

const AlertBanner = memo(function AlertBanner({
  alert,
  onDismiss,
}: {
  alert:     AlertState;
  onDismiss: () => void;
}) {
  return (
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
  );
});

// ─── BanOverlay ───────────────────────────────────────────────────────────────

const BanOverlay = memo(function BanOverlay({ reason }: { reason: string }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const blockDevTools = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === "U")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("keydown", blockDevTools, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", blockDevTools, true);
    };
  }, []);

  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        999999,
        background:    "#000000",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        justifyContent:"center",
        pointerEvents: "all",
        userSelect:    "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      tabIndex={-1}
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="ban-title"
      aria-describedby="ban-reason"
    >
      <div
        className="flex flex-col items-center gap-6 px-6 text-center max-w-lg"
        style={{ pointerEvents: "none", userSelect: "none", WebkitUserSelect: "none" }}
      >
        <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        </div>
        <h1 id="ban-title" className="text-4xl font-extrabold text-red-500 tracking-tight">
          You Have Been Banned
        </h1>
        {reason && reason.trim() !== "" ? (
          <div id="ban-reason" className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 w-full">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Reason</p>
            <p className="text-white text-base font-medium">{reason}</p>
          </div>
        ) : (
          <p id="ban-reason" className="text-white/50 text-sm">No reason was provided.</p>
        )}
        <p className="text-white/30 text-xs">
          If you believe this is a mistake, contact support via Discord.
        </p>
      </div>
    </div>
  );
});

// ─── AdminMessageModal ────────────────────────────────────────────────────────

const AdminMessageModal = memo(function AdminMessageModal({
  message,
  onDismiss,
}: {
  message:   string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         99998,
        background:     "rgba(0,0,0,0.7)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-msg-label"
    >
      <div
        style={{
          maxWidth:     440,
          width:        "90%",
          background:   "#111",
          border:       "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding:      "32px 28px",
          textAlign:    "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width:        48,
            height:       48,
            borderRadius: "50%",
            background:   "rgba(234,179,8,0.15)",
            border:       "2px solid #ca8a04",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            margin:       "0 auto 16px",
          }}
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#eab308" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p
          id="admin-msg-label"
          style={{
            fontSize:      11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.35)",
            marginBottom:  8,
          }}
        >
          Message from Admin
        </p>
        <p style={{ fontSize: 16, color: "#fff", fontWeight: 500, lineHeight: 1.5, marginBottom: 24 }}>
          {message}
        </p>
        <button
          onClick={onDismiss}
          style={{
            background:   "rgba(255,255,255,0.08)",
            border:       "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color:        "rgba(255,255,255,0.6)",
            fontSize:     13,
            padding:      "8px 24px",
            cursor:       "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
});

// ─── AppInner ─────────────────────────────────────────────────────────────────

function AppInner() {
  const [sessionToken] = useState<string>(getOrCreateSessionToken);
  const [alert,    setAlert]    = useState<AlertState | null>(null);
  const [ban,      setBan]      = useState<BanState   | null>(null);
  const [adminMsg, setAdminMsg] = useState<string     | null>(null);
  const [banChecked, setBanChecked] = useState(false);

  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  const [location] = useLocation();
  useUserTracker(location);

  // ── Ban + initial admin-message check ────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) { setBanChecked(true); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_sessions")
          .select("is_banned, ban_reason, admin_message")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (data?.is_banned)      setBan({ reason: data.ban_reason ?? "" });
        if (data?.admin_message)  setAdminMsg(data.admin_message);
      } catch { /* Non-critical */ }
      finally  { setBanChecked(true); }
    })();
  }, [sessionToken]);

  // ── Active site-alert check ───────────────────────────────────────────────
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
      } catch { /* Non-critical */ }
    })();
  }, []);

  // ── Multiplexed WebSocket channel ────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const setupChannel = () => {
      if (destroyed) return;
      ch = supabase
        .channel(`app-session-${sessionToken}`, { config: { broadcast: { ack: false } } })
        .on("broadcast", { event: "admin_action" }, ({ payload }) => {
          const action = payload?.action as string | undefined;
          if      (action === "ban")           setBan({ reason: (payload?.reason as string) ?? "" });
          else if (action === "unban")         setBan(null);
          else if (action === "message")       { const msg = payload?.message as string | null; if (msg) setAdminMsg(msg); }
          else if (action === "clear_message") setAdminMsg(null);
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "user_sessions",
          filter: `session_token=eq.${sessionToken}`,
        }, (payload) => {
          const row = payload.new as { is_banned?: boolean; ban_reason?: string | null; admin_message?: string | null; };
          if (row.is_banned === true)  setBan({ reason: row.ban_reason ?? "" });
          if (row.is_banned === false) setBan(null);
          if ("admin_message" in row)  setAdminMsg(row.admin_message ?? null);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "site_alerts" }, (payload) => {
          if (payload.eventType === "DELETE") {
            setAlert((prev) => prev?.id === (payload.old as { id: string }).id ? null : prev);
            return;
          }
          const row = payload.new as { id: string; message: string; active: boolean; };
          if (row.active && row.message) setAlert({ id: row.id, message: row.message });
          else setAlert((prev) => (prev?.id === row.id ? null : prev));
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" && !destroyed) {
            retryTimer = setTimeout(() => {
              if (ch) { supabase.removeChannel(ch).catch(() => null); ch = null; }
              setupChannel();
            }, 3000);
          }
        });
    };

    setupChannel();
    return () => {
      destroyed = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      if (ch) supabase.removeChannel(ch).catch(() => null);
    };
  }, [sessionToken]);

  // ── Banner height measurement ─────────────────────────────────────────────
  useEffect(() => {
    const el = bannerContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        setBannerHeight(Math.ceil(h));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [alert]);

  const dismissAlert    = useCallback(() => setAlert(null),    []);
  const dismissAdminMsg = useCallback(() => setAdminMsg(null), []);

  if (!banChecked) return <SkeletonLoader />;
  if (ban !== null) return <BanOverlay reason={ban.reason} />;

  const showBanner = alert !== null;

  return (
    <>
      {adminMsg && (
        <AdminMessageModal message={adminMsg} onDismiss={dismissAdminMsg} />
      )}

      {showBanner && (
        <div
          ref={bannerContainerRef}
          style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 99999 }}
        >
          <AlertBanner alert={alert} onDismiss={dismissAlert} />
        </div>
      )}

      <div
        style={{
          paddingTop: showBanner && bannerHeight > 0 ? `${bannerHeight}px` : undefined,
          transition: "padding-top 0.15s ease",
        }}
      >
        <Switch>
          {/* ── Public pages — each wrapped in Suspense + Layout ─────────── */}
          <Route path="/">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Home />
              </Suspense>
            </Layout>
          </Route>

          <Route path="/portfolio">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Portfolio />
              </Suspense>
            </Layout>
          </Route>

          <Route path="/games">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Games />
              </Suspense>
            </Layout>
          </Route>

          <Route path="/pricing">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Pricing />
              </Suspense>
            </Layout>
          </Route>

          <Route path="/reviews">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Reviews />
              </Suspense>
            </Layout>
          </Route>

          <Route path="/policies">
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Policies />
              </Suspense>
            </Layout>
          </Route>

          {/* ── Admin pages — no Layout wrapper ─────────────────────────── */}
          <Route path="/admin">
            <Suspense fallback={<PageSkeleton />}>
              <AdminLogin />
            </Suspense>
          </Route>

          <Route path="/admin/dashboard">
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          </Route>

          {/* ── 404 ──────────────────────────────────────────────────────── */}
          <Route>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <NotFound />
              </Suspense>
            </Layout>
          </Route>
        </Switch>
      </div>
    </>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="youssef-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="yd_language">
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}
