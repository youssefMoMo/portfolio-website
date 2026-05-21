// src/App.tsx
//
// ╔═══════════════════════════════════════════════════════════════════╗
// ║  PROVIDER HIERARCHY (outermost → innermost)                      ║
// ║                                                                   ║
// ║  ThemeProvider      — must wrap everything; Navbar calls         ║
// ║    LanguageProvider   useTheme() on first render                 ║
// ║      [moderation state + realtime subscriptions]                 ║
// ║        RouterContent → Layout → Navbar (safe to call hooks)      ║
// ║                                                                   ║
// ║  Rule: any component that calls useTheme() or useLanguage()      ║
// ║  MUST be rendered below both providers. Nothing is rendered      ║
// ║  outside this tree.                                               ║
// ╚═══════════════════════════════════════════════════════════════════╝

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

// ─── Context providers (MUST be at absolute root) ────────────────────────────
import { ThemeProvider }    from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";

// ─── Supabase + tracker ───────────────────────────────────────────────────────
import { supabase }         from "@/lib/supabase";
import { useUserTracker }   from "@/hooks/useUserTracker";

// ─── Layout wrapper (public pages) ───────────────────────────────────────────
import { Layout }           from "@/components/layout/Layout";

// ─── Moderation overlays ──────────────────────────────────────────────────────
import BannedScreen, {
  UnbanToast,
  AdminBroadcastBanner,
} from "@/components/BannedScreen";

// ─── Eager-loaded pages (critical path) ──────────────────────────────────────
import Home       from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import NotFound   from "@/pages/not-found";

// ─── Lazy-loaded pages (deferred until navigated to) ─────────────────────────
const Portfolio      = lazy(() => import("@/pages/Portfolio"));
const Games          = lazy(() => import("@/pages/Games"));
const Pricing        = lazy(() => import("@/pages/Pricing"));
const Reviews        = lazy(() => import("@/pages/Reviews"));
const Policies       = lazy(() => import("@/pages/Policies"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCallback  = lazy(() => import("@/pages/admin/callback"));

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
import { ProtectedRoute }   from "@/components/ProtectedRoute";

// ─── Shared page-loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
    </div>
  );
}

// ─── Session-token reader ─────────────────────────────────────────────────────
// Key must match SESSION_KEY in useUserTracker.ts
function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem("youssef_session_token");
  } catch {
    return null;
  }
}

// ─── RouterContent ────────────────────────────────────────────────────────────
// Sits INSIDE the provider tree so useLocation(), useTheme(), useLanguage()
// are all safe to call in Layout → Navbar → any page component.
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

  // Silently track the visitor's session (Geo-IP + page heartbeat)
  useUserTracker(location);

  // When banned, render nothing here — the BannedScreen overlay is
  // shown by the parent AppShell above us in the tree.
  if (isBanned) return null;

  return (
    <>
      {/* Admin broadcast banner — floats above all page content */}
      <AnimatePresence>
        {adminMessage && (
          <AdminBroadcastBanner
            key="admin-banner"
            message={adminMessage}
            onDismiss={onDismissAdminBanner}
          />
        )}
      </AnimatePresence>

      {/* ── Route table ─────────────────────────────────────────────── */}
      <Switch>
        {/* Public pages — wrapped in shared Layout (Navbar + Footer) */}
        <Route path="/">
          <Layout><Home /></Layout>
        </Route>

        <Route path="/portfolio">
          <Layout>
            <Suspense fallback={<PageLoader />}><Portfolio /></Suspense>
          </Layout>
        </Route>

        <Route path="/games">
          <Layout>
            <Suspense fallback={<PageLoader />}><Games /></Suspense>
          </Layout>
        </Route>

        <Route path="/pricing">
          <Layout>
            <Suspense fallback={<PageLoader />}><Pricing /></Suspense>
          </Layout>
        </Route>

        <Route path="/reviews">
          <Layout>
            <Suspense fallback={<PageLoader />}><Reviews /></Suspense>
          </Layout>
        </Route>

        <Route path="/policies">
          <Layout>
            <Suspense fallback={<PageLoader />}><Policies /></Suspense>
          </Layout>
        </Route>

        {/* Admin pages — no Layout wrapper */}
        <Route path="/admin">
          <AdminLogin />
        </Route>

        <Route path="/admin/callback">
          <Suspense fallback={<PageLoader />}><AdminCallback /></Suspense>
        </Route>

        <Route path="/admin/dashboard">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
          </ProtectedRoute>
        </Route>

        {/* 404 catch-all */}
        <Route>
          <Layout><NotFound /></Layout>
        </Route>
      </Switch>
    </>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
// Handles all moderation state and realtime subscriptions.
// Rendered INSIDE ThemeProvider + LanguageProvider so every hook in every
// child component can safely call useTheme() / useLanguage().
function AppShell() {
  // ── Moderation state ──────────────────────────────────────────────────
  const [isBanned,     setIsBanned]     = useState(false);
  const [banReason,    setBanReason]    = useState<string | null>(null);
  const [unbanMessage, setUnbanMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Ref mirror so the realtime callback always reads the current value,
  // not the stale closure value captured at channel-subscribe time.
  const isBannedRef = useRef(false);
  useEffect(() => { isBannedRef.current = isBanned; }, [isBanned]);

  // ── Resolve session token ─────────────────────────────────────────────
  // useUserTracker writes it to sessionStorage on mount; we poll until
  // it appears so we can attach the realtime subscription to the right row.
  useEffect(() => {
    let attempts = 0;
    const poll = setInterval(() => {
      const tok = getSessionToken();
      if (tok) {
        setSessionToken(tok);
        clearInterval(poll);
      }
      // Give up after ~3 s to avoid an infinite poll in private-browsing
      // environments or when Supabase is not configured.
      if (++attempts > 30) clearInterval(poll);
    }, 100);
    return () => clearInterval(poll);
  }, []);

  // ── Bootstrap: hydrate ban + admin-message from current DB row ────────
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

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;

    const channel = supabase
      .channel(`app-session-${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "user_sessions",
          filter: `session_token=eq.${sessionToken}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;

          // State A — Ban
          if (row.is_banned === true) {
            setBanReason((row.ban_reason as string | null) ?? null);
            setIsBanned(true);
            return;
          }

          // State B — Unban (read ref to avoid stale closure)
          if (row.is_banned === false && isBannedRef.current) {
            setIsBanned(false);
            setUnbanMessage((row.unban_message as string | null) ?? null);
            return;
          }

          // State C — Live admin broadcast message
          setAdminMessage((row.admin_message as string | null) ?? null);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionToken]);

  // ── Callbacks ─────────────────────────────────────────────────────────
  const handleUnban        = useCallback((msg: string | null) => {
    setIsBanned(false);
    setUnbanMessage(msg);
  }, []);
  const dismissUnbanToast  = useCallback(() => setUnbanMessage(null), []);
  const dismissAdminBanner = useCallback(() => setAdminMessage(null), []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Unban toast — slides in from top after ban is lifted */}
      <AnimatePresence>
        {unbanMessage && (
          <UnbanToast
            key="unban-toast"
            message={unbanMessage}
            onDismiss={dismissUnbanToast}
          />
        )}
      </AnimatePresence>

      {/* Full-page banned screen */}
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
       * Main app shell — always mounted.
       * Renders null when banned so only BannedScreen is visible.
       */}
      <RouterContent
        isBanned={isBanned}
        adminMessage={adminMessage}
        onDismissAdminBanner={dismissAdminBanner}
      />
    </>
  );
}

// ─── App (root export) ────────────────────────────────────────────────────────
// ThemeProvider and LanguageProvider are the outermost wrappers so that
// every component in the entire tree — including Navbar, Layout, all pages,
// all admin components, and all moderation overlays — can safely call
// useTheme() and useLanguage() without a context-missing runtime error.
export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="yd_language">
        <AppShell />
      </LanguageProvider>
    </ThemeProvider>
  );
}
