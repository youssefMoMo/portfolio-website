"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUserTracker } from "@/hooks/useUserTracker";

// ─── Layout wrapper (public pages) ───────────────────────────────────────────
import { Layout } from "@/components/layout/Layout";

// ─── Moderation overlays ─────────────────────────────────────────────────────
import BannedScreen, {
  UnbanToast,
  AdminBroadcastBanner,
} from "@/components/BannedScreen";

// ─── Eager-loaded pages (critical path) ──────────────────────────────────────
import Home          from "@/pages/Home";
import AdminLogin    from "@/pages/AdminLogin";
import NotFound      from "@/pages/not-found";

// ─── Lazy-loaded pages (deferred until navigated to) ─────────────────────────
const Portfolio      = lazy(() => import("@/pages/Portfolio"));
const Games          = lazy(() => import("@/pages/Games"));
const Pricing        = lazy(() => import("@/pages/Pricing"));
const Reviews        = lazy(() => import("@/pages/Reviews"));
const Policies       = lazy(() => import("@/pages/Policies"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCallback  = lazy(() => import("@/pages/admin/callback"));

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
import { ProtectedRoute } from "@/components/ProtectedRoute";

// ─── Shared page-loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
    </div>
  );
}

// ─── Session-token reader (must match useUserTracker's SESSION_KEY) ───────────
function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem("youssef_session_token");
  } catch {
    return null;
  }
}

// ─── Inner router — receives currentPage so useUserTracker stays up-to-date ──
/**
 * RouterContent sits INSIDE App so it can consume the location from wouter's
 * context and forward it to useUserTracker without having to prop-drill.
 */
function RouterContent({
  isBanned,
  adminMessage,
  onDismissAdminBanner,
}: {
  isBanned: boolean;
  adminMessage: string | null;
  onDismissAdminBanner: () => void;
}) {
  const [location] = useLocation();

  // ── Track the visitor's session (Geo-IP + heartbeat) ───────────────────
  useUserTracker(location);

  // Don't render any routes if the user is banned — BannedScreen is shown
  // by the parent App component instead.
  if (isBanned) return null;

  return (
    <>
      {/* Admin broadcast banner — sits above all page content */}
      <AnimatePresence>
        {adminMessage && (
          <AdminBroadcastBanner
            key="admin-banner"
            message={adminMessage}
            onDismiss={onDismissAdminBanner}
          />
        )}
      </AnimatePresence>

      {/* ── Route table ─────────────────────────────────────────────────── */}
      <Switch>
        {/* ── Public pages (wrapped in shared Layout) ── */}
        <Route path="/">
          <Layout><Home /></Layout>
        </Route>

        <Route path="/portfolio">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Portfolio />
            </Suspense>
          </Layout>
        </Route>

        <Route path="/games">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Games />
            </Suspense>
          </Layout>
        </Route>

        <Route path="/pricing">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Pricing />
            </Suspense>
          </Layout>
        </Route>

        <Route path="/reviews">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Reviews />
            </Suspense>
          </Layout>
        </Route>

        <Route path="/policies">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Policies />
            </Suspense>
          </Layout>
        </Route>

        {/* ── Admin pages (no Layout wrapper) ── */}
        <Route path="/admin">
          <AdminLogin />
        </Route>

        <Route path="/admin/callback">
          <Suspense fallback={<PageLoader />}>
            <AdminCallback />
          </Suspense>
        </Route>

        <Route path="/admin/dashboard">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        </Route>

        {/* ── 404 catch-all ── */}
        <Route>
          <Layout><NotFound /></Layout>
        </Route>
      </Switch>
    </>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── Moderation state ────────────────────────────────────────────────────
  const [isBanned,     setIsBanned]     = useState(false);
  const [banReason,    setBanReason]    = useState<string | null>(null);
  const [unbanMessage, setUnbanMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  /**
   * Ref mirror of isBanned so the realtime callback always reads the live
   * value — not the stale closure captured when the channel was subscribed.
   * Without this, the State-B (unban) branch can never fire.
   */
  const isBannedRef = useRef(false);
  useEffect(() => { isBannedRef.current = isBanned; }, [isBanned]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Resolve session token ────────────────────────────────────────────────
  // useUserTracker writes the token to sessionStorage; we poll briefly until
  // it appears so we can attach the realtime subscription to the right row.
  useEffect(() => {
    let attempts = 0;
    const poll = setInterval(() => {
      const tok = getSessionToken();
      if (tok) {
        setSessionToken(tok);
        clearInterval(poll);
      }
      // Give up after ~3 s (30 × 100 ms) to avoid polling forever if
      // Supabase is disabled or the user is in a private-browsing environment.
      if (++attempts > 30) clearInterval(poll);
    }, 100);
    return () => clearInterval(poll);
  }, []);

  // ── Bootstrap: load current ban / admin-message state ───────────────────
  useEffect(() => {
    if (!sessionToken) return;

    (async () => {
      const { data } = await supabase
        .from("user_sessions")
        .select("is_banned, ban_reason, admin_message")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (data) {
        setIsBanned(!!data.is_banned);
        setBanReason(data.ban_reason ?? null);
        setAdminMessage(data.admin_message ?? null);
      }
    })();
  }, [sessionToken]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;

    const channel = supabase
      .channel(`app-session-${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_sessions",
          filter: `session_token=eq.${sessionToken}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;

          // ── State A: Ban ──────────────────────────────────────────────
          if (row.is_banned === true) {
            setBanReason((row.ban_reason as string | null) ?? null);
            setIsBanned(true);
            return;
          }

          // ── State B: Unban ────────────────────────────────────────────
          // Read from the ref — the closure value of `isBanned` is stale.
          if (row.is_banned === false && isBannedRef.current) {
            setIsBanned(false);
            setUnbanMessage((row.unban_message as string | null) ?? null);
            return;
          }

          // ── State C: Live admin broadcast message ─────────────────────
          setAdminMessage((row.admin_message as string | null) ?? null);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [sessionToken]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleUnban = useCallback((msg: string | null) => {
    setIsBanned(false);
    setUnbanMessage(msg);
  }, []);

  const dismissUnbanToast    = useCallback(() => setUnbanMessage(null), []);
  const dismissAdminBanner   = useCallback(() => setAdminMessage(null), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Unban toast (slides in from top after ban is lifted) ──────── */}
      <AnimatePresence>
        {unbanMessage && (
          <UnbanToast
            key="unban-toast"
            message={unbanMessage}
            onDismiss={dismissUnbanToast}
          />
        )}
      </AnimatePresence>

      {/* ── Full-page banned screen ───────────────────────────────────── */}
      <AnimatePresence>
        {isBanned && sessionToken && (
          <BannedScreen
            key="banned"
            sessionToken={sessionToken}
            initialBanReason={banReason}
            onUnban={handleUnban}
          />
        )}
      </AnimatePresence>

      {/*
       * ── Main app shell ──────────────────────────────────────────────
       *
       * RouterContent is always mounted. When the user is banned it renders
       * null (no routes), so only the BannedScreen above is visible.
       * When unbanned, routes and the admin-message banner re-appear.
       *
       * The wouter <Router> context is provided by RouterContent via the
       * wouter package's default browser history provider — no explicit
       * <Router> wrapper needed for browser environments.
       */}
      <RouterContent
        isBanned={isBanned}
        adminMessage={adminMessage}
        onDismissAdminBanner={dismissAdminBanner}
      />
    </>
  );
}
