"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

// Components
import BannedScreen, {
  UnbanToast,
  AdminBroadcastBanner,
} from "@/components/BannedScreen";
import Navbar from "@/components/layout/Navbar";
// ... import your page router / layout components here

// ─── Session-token helper (must match useUserTracker) ────────────────────────
function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem("youssef_session_token");
  } catch {
    return null;
  }
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [unbanMessage, setUnbanMessage] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Resolve session token on mount ──────────────────────────────────────
  useEffect(() => {
    // The token may not exist yet if useUserTracker hasn't run. Poll briefly.
    let attempts = 0;
    const poll = setInterval(() => {
      const tok = getSessionToken();
      if (tok) {
        setSessionToken(tok);
        clearInterval(poll);
      }
      if (++attempts > 20) clearInterval(poll); // give up after 2 s
    }, 100);
    return () => clearInterval(poll);
  }, []);

  // ── Bootstrap: fetch initial ban state ──────────────────────────────────
  useEffect(() => {
    if (!sessionToken) return;

    async function fetchSession() {
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
    }

    fetchSession();
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
          // supabase-js v2: mutations land on payload.new, not payload.payload
          const row = payload.new;
          if (!row) return;

          // ── State A: Ban ─────────────────────────────────────────────
          if (row.is_banned === true) {
            setBanReason((row.ban_reason as string | null) ?? null);
            setIsBanned(true);
            return;
          }

          // ── State B: Unban ───────────────────────────────────────────
          if (row.is_banned === false && isBanned) {
            setIsBanned(false);
            const msg = (row.unban_message as string | null) ?? null;
            setUnbanMessage(msg);
            return;
          }

          // ── State C: Live admin message ──────────────────────────────
          const newMsg = (row.admin_message as string | null) ?? null;
          setAdminMessage(newMsg);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // ── Callbacks ────────────────────────────────────────────────────────────
  const handleUnban = useCallback((msg: string | null) => {
    setIsBanned(false);
    setUnbanMessage(msg);
  }, []);

  const dismissUnbanToast = useCallback(() => setUnbanMessage(null), []);
  const dismissAdminBanner = useCallback(() => setAdminMessage(null), []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global Overlays ──────────────────────────────────────────── */}
      <AnimatePresence>
        {unbanMessage && (
          <UnbanToast
            key="unban-toast"
            message={unbanMessage}
            onDismiss={dismissUnbanToast}
          />
        )}
      </AnimatePresence>

      {/* ── Banned Screen (full-page takeover) ───────────────────────── */}
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

      {/* ── Normal Site Layout ────────────────────────────────────────── */}
      {!isBanned && (
        <div className="flex flex-col min-h-screen">
          {/* Admin broadcast banner sits ABOVE the navbar */}
          <AnimatePresence>
            {adminMessage && (
              <AdminBroadcastBanner
                key="admin-banner"
                message={adminMessage}
                onDismiss={dismissAdminBanner}
              />
            )}
          </AnimatePresence>

          <Navbar />

          {/* ↓ Your router / page content goes here */}
          <main className="flex-1">
            {/* <RouterOutlet /> or <PageContent /> */}
          </main>
        </div>
      )}
    </>
  );
}
