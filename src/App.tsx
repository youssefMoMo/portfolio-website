import React, {
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
import Home from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Games from "./pages/Games";
import Pricing from "./pages/Pricing";
import Reviews from "./pages/Reviews";
import Policies from "./pages/Policies";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/not-found";

// ─── Constants ────────────────────────────────────────────────────────────────
// localStorage key — persists across tabs and browser restarts so the ban
// state is synchronised across all open viewports for the same device.
const LOCAL_STORAGE_KEY = "youssef_session_token";
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30-day rolling window — sustains session across cold boots 0026 VPN swaps

// ─── Helpers (pure functions — no hooks, no context) ─────────────────────────
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
  token: string;
  expiresAt: number;
}

/**
 * Reads or creates a session token stored in localStorage with a
 * 30-minute rolling expiry. Each call that finds a valid token
 * extends the expiry by another 30 minutes (rolling window).
 *
 * Using localStorage (not sessionStorage) so the same token — and therefore
 * the same ban state — is shared across all tabs and browser windows on this
 * device. Falls back to an ephemeral in-memory token if storage is blocked.
 */
function getOrCreateSessionToken(): string {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const data: SessionData = JSON.parse(raw);
      if (Date.now() < data.expiresAt) {
        // Roll the expiry forward
        data.expiresAt = Date.now() + SESSION_EXPIRY_MS;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data.token;
      }
      // Expired — clear and regenerate
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — return an ephemeral token
    return generateUUID();
  }
  const token = generateUUID();
  const data: SessionData = { token, expiresAt: Date.now() + SESSION_EXPIRY_MS };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* Storage full or blocked — continue with in-memory token */
  }
  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AlertState {
  id: string;
  message: string;
}
interface BanState {
  reason: string;
}

// ─── SkeletonLoader ───────────────────────────────────────────────────────────
// Rendered during the initial ban/session check to prevent FOUC.
// Uses CSS variables so it adapts to both light and dark themes.
const SkeletonLoader = memo(function SkeletonLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsl(var(--background))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid hsl(var(--muted))",
            borderTopColor: "hsl(var(--primary))",
            animation: "yd-spin 0.7s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Verifying session…
        </span>
      </div>
      {/* Scoped keyframe — does not pollute global sheet */}
      <style>{`@keyframes yd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

// ─── AlertBanner ─────────────────────────────────────────────────────────────
// NOTE: Pure UI component — does NOT call useTheme / useLanguage.
// The wrapping container in AppInner supplies position:fixed + zIndex.
const AlertBanner = memo(function AlertBanner({
  alert,
  onDismiss,
}: {
  alert: AlertState;
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
// SECURITY NOTE: This is a frontend-only deterrent. A determined user with
// physical device access can always bypass client-side restrictions. Permanent
// enforcement must be implemented server-side (DB row checks, API gating).
// This overlay makes casual tampering significantly harder.
const BanOverlay = memo(function BanOverlay({ reason }: { reason: string }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Intercept common developer-tools keyboard shortcuts to disrupt casual
    // inspection of the blocked layout. These are deterrents, not hard locks.
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
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Disrupt casual DOM inspection by disabling pointer interaction on
        // anything rendered beneath this overlay in the stacking context.
        pointerEvents: "all",
        userSelect: "none",
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
      {/* Obscured layout — pointer-events:none prevents click-through */}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        </div>
        <h1
          id="ban-title"
          className="text-4xl font-extrabold text-red-500 tracking-tight"
        >
          You Have Been Banned
        </h1>
        {reason && reason.trim() !== "" ? (
          <div
            id="ban-reason"
            className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 w-full"
          >
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
              Reason
            </p>
            <p className="text-white text-base font-medium">{reason}</p>
          </div>
        ) : (
          <p id="ban-reason" className="text-white/50 text-sm">
            No reason was provided.
          </p>
        )}
        <p className="text-white/30 text-xs">
          If you believe this is a mistake, contact support via Discord.
        </p>
      </div>
    </div>
  );
});

// ─── AdminMessageModal ────────────────────────────────────────────────────────
// NOTE: Pure UI — does NOT call useTheme / useLanguage.
const AdminMessageModal = memo(function AdminMessageModal({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-msg-label"
    >
      <div
        style={{
          maxWidth: 440,
          width: "90%",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: "32px 28px",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(234,179,8,0.15)",
            border: "2px solid #ca8a04",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#eab308"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p
          id="admin-msg-label"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: 8,
          }}
        >
          Message from Admin
        </p>
        <p
          style={{
            fontSize: 16,
            color: "#fff",
            fontWeight: 500,
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          {message}
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            padding: "8px 24px",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
});

// ─── AppInner ─────────────────────────────────────────────────────────────────
// Every hook, subscription, banner, and route lives here.
// Always rendered inside ThemeProvider + LanguageProvider, so all children
// can safely call useTheme / useLanguage.
function AppInner() {
  const [sessionToken] = useState<string>(getOrCreateSessionToken);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [ban, setBan] = useState<BanState | null>(null);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // banChecked: always starts false. Resolved either immediately (no Supabase)
  // or after the DB check completes. Prevents any content painting before we
  // know the session's ban status — closes the F5-refresh bypass window.
  const [banChecked, setBanChecked] = useState(false);

  // ResizeObserver ref: measures the fixed alert banner's actual pixel height
  // so the main content can apply an exact fluid paddingTop with no overlap.
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  // ── Live tracking ─────────────────────────────────────────────────────────
  const [location] = useLocation();
  useUserTracker(location);

  // ── Ban + initial admin-message check on mount ────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) {
      setBanChecked(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_sessions")
          .select("is_banned, ban_reason, admin_message")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (data?.is_banned) {
          setBan({ reason: data.ban_reason ?? "" });
        }
        if (data?.admin_message) {
          setAdminMsg(data.admin_message);
        }
      } catch {
        /* Non-critical — app renders normally if check fails */
      } finally {
        setBanChecked(true);
      }
    })();
  }, [sessionToken]);

  // ── Active site-alert check on mount ─────────────────────────────────────
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
      } catch {
        /* Non-critical */
      }
    })();
  }, []);

  // ── Unified multiplexed WebSocket channel ────────────────────────────────
  // Consolidates all real-time subscriptions into one channel to reduce
  // WebSocket connections. Automatically retries after CHANNEL_ERROR with a
  // 3-second backoff to survive transient network blips.
  //
  // Listens to:
  //   • broadcast  admin_action      — instant admin commands (<50 ms)
  //   • postgres_changes user_sessions — persisted fallback (~500 ms)
  //   • postgres_changes site_alerts   — global alert lifecycle
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const setupChannel = () => {
      if (destroyed) return;

      ch = supabase
        .channel(`app-session-${sessionToken}`, {
          config: { broadcast: { ack: false } },
        })
        // ── Path 1: broadcast — instant delivery (<50 ms), primary path ──
        .on("broadcast", { event: "admin_action" }, ({ payload }) => {
          const action = payload?.action as string | undefined;
          if (action === "ban") {
            setBan({ reason: (payload?.reason as string) ?? "" });
          } else if (action === "unban") {
            setBan(null);
          } else if (action === "message") {
            const msg = payload?.message as string | null;
            if (msg) setAdminMsg(msg);
          } else if (action === "clear_message") {
            setAdminMsg(null);
          }
        })
        // ── Path 2: postgres_changes user_sessions — persisted fallback ──
        // Catches events where broadcast was missed (e.g. tab backgrounded)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_sessions",
            filter: `session_token=eq.${sessionToken}`,
          },
          (payload) => {
            const row = payload.new as {
              is_banned?: boolean;
              ban_reason?: string | null;
              admin_message?: string | null;
            };
            if (row.is_banned === true) setBan({ reason: row.ban_reason ?? "" });
            if (row.is_banned === false) setBan(null);
            if ("admin_message" in row) setAdminMsg(row.admin_message ?? null);
          }
        )
        // ── Path 3: postgres_changes site_alerts — global alert lifecycle ─
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
            const row = payload.new as {
              id: string;
              message: string;
              active: boolean;
            };
            if (row.active && row.message) {
              setAlert({ id: row.id, message: row.message });
            } else {
              setAlert((prev) => (prev?.id === row.id ? null : prev));
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" && !destroyed) {
            // 3-second automatic retry on channel failure
            retryTimer = setTimeout(() => {
              if (ch) {
                supabase.removeChannel(ch).catch(() => null);
                ch = null;
              }
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

  // ── ResizeObserver — dynamic banner compensation ──────────────────────────
  // Measures the rendered height of the fixed AlertBanner container so the
  // main content padding stays pixel-perfect on all viewports, including
  // mobile where the banner may wrap to multiple lines.
  useEffect(() => {
    const el = bannerContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        setBannerHeight(Math.ceil(h));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [alert]); // Re-attach when alert mounts/unmounts

  const dismissAlert = useCallback(() => setAlert(null), []);
  const dismissAdminMsg = useCallback(() => setAdminMsg(null), []);

  // Show skeleton until we know ban status — prevents F5 refresh bypass
  if (!banChecked) return <SkeletonLoader />;

  // If the user is banned, completely unmount the app DOM tree and mount the
  // defensive overlay instead. Nothing in the app tree renders.
  if (ban !== null) return <BanOverlay reason={ban.reason} />;

  const showBanner = alert !== null;

  return (
    <>
      {/* ── Admin message modal ─────────────────────────────────────────── */}
      {adminMsg && (
        <AdminMessageModal message={adminMsg} onDismiss={dismissAdminMsg} />
      )}

      {/* ── Alert banner: fixed top bar, ResizeObserver-measured ────────── */}
      {showBanner && (
        <div
          ref={bannerContainerRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 99999,
          }}
        >
          <AlertBanner alert={alert} onDismiss={dismissAlert} />
        </div>
      )}

      {/* ── Page content: fluid offset by measured banner height ────────── */}
      <div
        style={{
          paddingTop: showBanner && bannerHeight > 0 ? `${bannerHeight}px` : undefined,
          transition: "padding-top 0.15s ease",
        }}
      >
        <Switch>
          <Route path="/">
            <Layout>
              <Home />
            </Layout>
          </Route>
          <Route path="/portfolio">
            <Layout>
              <Portfolio />
            </Layout>
          </Route>
          <Route path="/games">
            <Layout>
              <Games />
            </Layout>
          </Route>
          <Route path="/pricing">
            <Layout>
              <Pricing />
            </Layout>
          </Route>
          <Route path="/reviews">
            <Layout>
              <Reviews />
            </Layout>
          </Route>
          <Route path="/policies">
            <Layout>
              <Policies />
            </Layout>
          </Route>
          <Route path="/admin">
            <AdminLogin />
          </Route>
          <Route path="/admin/dashboard">
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          </Route>
          <Route>
            <Layout>
              <NotFound />
            </Layout>
          </Route>
        </Switch>
      </div>
    </>
  );
}

// ─── App (default export) ─────────────────────────────────────────────────────
// ⚠  Contains ONLY provider wrappers.
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
