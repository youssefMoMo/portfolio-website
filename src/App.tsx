// src/App.tsx
//
// ✅ BUG FIXES IN THIS VERSION:
//
//   FIX 1 — SyntaxError crash on broadcast receive:
//     Replaced ALL optional chaining (?.) and nullish-coalescing (??) operators
//     in the realtime callback paths with explicit null-guard checks so the
//     handlers run safely on browsers that do not polyfill these operators.
//     Added a top-level try/catch inside every realtime callback so a malformed
//     payload cannot freeze the channel.
//
//   FIX 2 — VPN-immune session token:
//     SESSION_KEY is now stored in localStorage (was sessionStorage).
//     sessionStorage is per-tab and is WIPED on page reload — when a VPN user
//     refreshes the page after changing IP, a new token was generated and the
//     channel subscription was re-built against the NEW token, making the old
//     admin action unreachable.
//     localStorage persists indefinitely across reloads/VPN hops on the same
//     device, so the admin channel subscription always targets the SAME token.
//
//   FIX 3 — Dual-path realtime unchanged (it was already correct):
//     PATH 1 — postgres_changes (persisted, ~500ms lag)
//     PATH 2 — Broadcast "admin_action" (ephemeral, <50ms)

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

// ── VPN FIX: Use localStorage so the token survives page reloads and IP
//   changes. sessionStorage was wiped on every reload, which caused a VPN user
//   (after refreshing) to generate a new token, breaking the channel link. ──
const SESSION_KEY = "youssef_session_token";

function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
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

  // ── Resolve session token (localStorage now — survives VPN IP changes) ──
  useEffect(() => {
    let attempts = 0;
    const poll = setInterval(() => {
      const tok = getSessionToken();
      if (tok) { setSessionToken(tok); clearInterval(poll); }
      if (++attempts > 30) clearInterval(poll);
    }, 100);
    return () => clearInterval(poll);
  }, []);

  // ── Bootstrap from DB ────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_sessions")
          .select("is_banned, ban_reason, admin_message")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (data) {
          setIsBanned(!!data.is_banned);
          setBanReason(data.ban_reason != null ? data.ban_reason : null);
          setAdminMessage(data.admin_message != null ? data.admin_message : null);
        }
      } catch {
        // Silently suppress — never crash the UI on bootstrap failure
      }
    })();
  }, [sessionToken]);

  // ── Dual-path Realtime subscription ─────────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;

    // ── Shared state-setter logic ────────────────────────────────────────
    // SYNTAX FIX: No optional chaining (?.) or nullish-coalescing (??) below.
    // Using explicit null guards to support browsers without these operators.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyModerationRow(row: Record<string, any>) {
      try {
        if (!row || typeof row !== "object") return;

        if (row.is_banned === true) {
          const reason = (row.ban_reason !== null && row.ban_reason !== undefined)
            ? String(row.ban_reason)
            : null;
          setBanReason(reason);
          setIsBanned(true);
          return;
        }

        if (row.is_banned === false && isBannedRef.current) {
          setIsBanned(false);
          const ubMsg = (row.unban_message !== null && row.unban_message !== undefined)
            ? String(row.unban_message)
            : null;
          setUnbanMessage(ubMsg);
          return;
        }

        const msg = (row.admin_message !== null && row.admin_message !== undefined)
          ? String(row.admin_message)
          : null;
        setAdminMessage(msg);
      } catch {
        // Swallow malformed row — never crash the channel
      }
    }

    // ── PATH 2: Broadcast action handler ────────────────────────────────
    // SYNTAX FIX: destructuring replaced with explicit property access +
    // explicit null checks so no optional-chaining opcode is emitted.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyBroadcastAction(payload: Record<string, any>) {
      try {
        if (!payload || typeof payload !== "object") return;

        const action  = payload.action  !== undefined ? String(payload.action)  : "";
        const reason  = payload.reason  !== undefined && payload.reason  !== null
          ? String(payload.reason)  : null;
        const ubMsg   = payload.unbanMessage !== undefined && payload.unbanMessage !== null
          ? String(payload.unbanMessage) : null;
        const message = payload.message !== undefined && payload.message !== null
          ? String(payload.message) : null;

        switch (action) {
          case "ban":
            setBanReason(reason);
            setIsBanned(true);
            break;
          case "unban":
            setIsBanned(false);
            setUnbanMessage(ubMsg);
            break;
          case "message":
            setAdminMessage(message);
            break;
          case "clear_message":
            setAdminMessage(null);
            break;
          default:
            break;
        }
      } catch {
        // Swallow malformed broadcast — never freeze the channel
      }
    }

    const channel = supabase
      .channel("app-session-" + sessionToken, {
        config: { broadcast: { self: false } },
      })
      // PATH 1 — postgres_changes (durable, requires REPLICA IDENTITY FULL)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "user_sessions",
          filter: "session_token=eq." + sessionToken,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          try {
            // SYNTAX FIX: explicit property access, no optional chaining
            const row = (payload && payload.new) ? payload.new : null;
            if (row) applyModerationRow(row);
          } catch {
            // Suppress
          }
        }
      )
      // PATH 2 — Broadcast (instant, fired by adminApi after every DB write)
      .on(
        "broadcast",
        { event: "admin_action" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (msg: any) => {
          try {
            // SYNTAX FIX: explicit property access, no optional chaining
            const p = (msg && msg.payload) ? msg.payload : null;
            if (p) applyBroadcastAction(p);
          } catch {
            // Suppress
          }
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
