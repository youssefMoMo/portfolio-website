"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldBan, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BannedScreenProps {
  sessionToken: string;
  /** Initial ban_reason pulled from the first DB fetch in App.tsx */
  initialBanReason?: string | null;
  /** Called when is_banned flips to false so App.tsx can unmount us */
  onUnban: (unbanMessage: string | null) => void;
}

// ─── Unban Toast ──────────────────────────────────────────────────────────────
export function UnbanToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
                 flex items-start gap-3 max-w-lg w-full
                 rounded-2xl border border-emerald-400/30
                 bg-emerald-950/90 backdrop-blur-xl shadow-2xl
                 px-5 py-4"
    >
      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={22} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-emerald-300">
          Access Restored
        </p>
        <p className="text-sm text-emerald-100/80 mt-0.5">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-emerald-400/60 hover:text-emerald-300 transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ─── Admin Broadcast Banner ──────────────────────────────────────────────────
export function AdminBroadcastBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full overflow-hidden"
    >
      <div
        className="relative flex items-center justify-between gap-3
                   bg-amber-500 text-amber-950 px-4 py-2.5
                   text-sm font-semibold"
      >
        {/* Animated stripe background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,#000 0,#000 10px,transparent 10px,transparent 20px)",
          }}
        />
        <div className="relative flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss admin message"
          className="relative shrink-0 rounded px-2 py-0.5
                     bg-amber-950/20 hover:bg-amber-950/40
                     transition-colors text-xs"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main BannedScreen ────────────────────────────────────────────────────────
/**
 * BannedScreen
 *
 * Displayed when `is_banned = true` for the current session.
 *
 * Real-time subscription on the session row watches for:
 *   • `is_banned` → false  → calls `onUnban(unban_message)` so App.tsx
 *                             can unmount this component and show the toast.
 *   • `ban_reason` update  → refreshes the displayed reason live.
 */
export default function BannedScreen({
  sessionToken,
  initialBanReason,
  onUnban,
}: BannedScreenProps) {
  const [banReason, setBanReason] = useState<string | null>(
    initialBanReason ?? null
  );
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Subscribe to live session changes ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`ban-watch-${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_sessions",
          filter: `session_token=eq.${sessionToken}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;

          // is_banned toggled off → restore access
          if (row.is_banned === false) {
            const msg = (row.unban_message as string | null) ?? null;
            onUnban(msg);
            return;
          }

          // ban_reason updated live
          if (typeof row.ban_reason === "string") {
            setBanReason(row.ban_reason || null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionToken, onUnban]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center
                 bg-[#08090c] text-white"
      role="alert"
      aria-live="assertive"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-red-900/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center px-8 max-w-md"
      >
        {/* Icon */}
        <div className="mb-6 rounded-full bg-red-500/10 p-5 ring-1 ring-red-500/30">
          <ShieldBan className="text-red-400" size={48} strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Your session has been suspended by an administrator.
        </p>

        {/* Dynamic ban reason */}
        {banReason ? (
          <motion.div
            key={banReason}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-xl border border-red-500/20
                       bg-red-950/30 px-5 py-4 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">
              Reason
            </p>
            <p className="text-sm text-white/80 leading-relaxed">{banReason}</p>
          </motion.div>
        ) : (
          <div
            className="w-full rounded-xl border border-white/5
                       bg-white/5 px-5 py-4 text-left"
          >
            <p className="text-sm text-white/40 italic">
              No reason provided. Contact support for more information.
            </p>
          </div>
        )}

        <p className="mt-8 text-xs text-white/30">
          If you believe this is a mistake, please reach out via Discord.
        </p>
      </motion.div>
    </div>
  );
}
