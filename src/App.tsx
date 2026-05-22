// src/App.tsx
//
// ✅ REALTIME FIX:
//   The channel now listens on TWO paths simultaneously:
//
//   PATH 1 — postgres_changes (persisted, ~500ms lag, requires REPLICA IDENTITY FULL)
//     Kept for backwards compatibility and as a durable safety net.
//
//   PATH 2 — Broadcast "admin_action" event (ephemeral, <50ms, ZERO config required)
//     adminApi.ts fires this immediately after every DB write.
//     This is the PRIMARY path that triggers the live client-side reaction.
//
//   Both paths map action payloads to the same state setters, so whichever
//   arrives first wins — and they converge to the same result.

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

import { ThemeProvider }    from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";
import { supabase }         from "@/lib/supabase";
import { useUserTracker }   from "@/hooks/useUserTracker";
import { Layout }           from "@/components/layout/Layout";
import BannedScreen, {
  UnbanToast,
  AdminBroadcastBanner,
} from "@/components/BannedScreen";

import Home       from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import NotFound   from "@/pages/not-found";

const Portfolio      = lazy(() => import("@/pages/Portfolio"));
const Games          = lazy(() => import("@/pages/Games"));
const Pricing        = lazy(() => import("@/pages/Pricing"));
const Reviews        = lazy(() => import("@/pages/Reviews"));
const Policies       = lazy(() => import("@/pages/Policies"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCallback  = lazy(() => import("@/pages/admin/callback"));

import { ProtectedRoute } from "@/components/ProtectedRoute";

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
    </div>
  );
}

const SESSION_KEY = "youssef_session_token";

function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

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
  useUserTracker(location);

  if (isBanned) return null;

  return (
    <>
      <AnimatePresence>
        {adminMessage && (
          <AdminBroadcastBanner
            key="admin-banner"
            message={adminMessage}
            onDismiss={onDismissAdminBanner}
          />
        )}
      </AnimatePresence>

      <Switch>
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
        <Route>
          <Layout><NotFound /></Layout>
        </Route>
      </Switch>
    </>
  );
}

function AppShell() {
  const [isBanned,     setIsBanned]     = useState(false);
  const [banReason,    setBanReason]    = useState<string | null>(null);
  const [unbanMessage, setUnbanMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const isBannedRef = useRef(false);
  useEffect(() => { isBannedRef.current = isBanned; }, [isBanned]);

  // ── Resolve session token ────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const poll = setInterval(() => {
      const tok = getSessionToken();
      if (tok) { setSessionToken(tok); clearInterval(poll); }
      if (++attempts > 30) clearInterval(poll);
    }, 100);
    return () => clearInterval(poll);
  }, []);

  // ── Bootstrap from DB ────────────────────────────────────────────────
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

  // ── Dual-path Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;

    // ── Shared state-setter logic ──────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyModerationRow(row: Record<string, any>) {
      if (row.is_banned === true) {
        setBanReason((row.ban_reason as string | null) ?? null);
        setIsBanned(true);
        return;
      }
      if (row.is_banned === false && isBannedRef.current) {
        setIsBanned(false);
        setUnbanMessage((row.unban_message as string | null) ?? null);
        return;
      }
      setAdminMessage((row.admin_message as string | null) ?? null);
    }

    // ── PATH 2: Broadcast action handler ──────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyBroadcastAction(payload: Record<string, any>) {
      const { action, reason, unbanMessage: ubMsg, message } = payload;

      switch (action) {
        case "ban":
          setBanReason(reason ?? null);
          setIsBanned(true);
          break;
        case "unban":
          setIsBanned(false);
          setUnbanMessage(ubMsg ?? null);
          break;
        case "message":
          setAdminMessage(message ?? null);
          break;
        case "clear_message":
          setAdminMessage(null);
          break;
        default:
          break;
      }
    }

    const channel = supabase
      .channel(`app-session-${sessionToken}`, {
        config: { broadcast: { self: false } },
      })
      // PATH 1 — postgres_changes (durable, requires REPLICA IDENTITY FULL)
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
          if (row) applyModerationRow(row);
        }
      )
      // PATH 2 — Broadcast (instant, fired by adminApi after every DB write)
      .on(
        "broadcast",
        { event: "admin_action" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (msg: any) => {
          const p = msg?.payload;
          if (p) applyBroadcastAction(p);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionToken]);

  const handleUnban        = useCallback((msg: string | null) => {
    setIsBanned(false);
    setUnbanMessage(msg);
  }, []);
  const dismissUnbanToast  = useCallback(() => setUnbanMessage(null), []);
  const dismissAdminBanner = useCallback(() => setAdminMessage(null), []);

  return (
    <>
      <AnimatePresence>
        {unbanMessage && (
          <UnbanToast
            key="unban-toast"
            message={unbanMessage}
            onDismiss={dismissUnbanToast}
          />
        )}
      </AnimatePresence>

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

      <RouterContent
        isBanned={isBanned}
        adminMessage={adminMessage}
        onDismissAdminBanner={dismissAdminBanner}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <LanguageProvider defaultLanguage="en" storageKey="yd_language">
        <AppShell />
      </LanguageProvider>
    </ThemeProvider>
  );
}
