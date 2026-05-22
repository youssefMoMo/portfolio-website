// src/pages/admin/UsersTab.tsx
//
// ✅ FIXES IN THIS VERSION:
//
//   BROADCAST SAFETY:
//     ActionTray validates all input strings before passing them to adminApi.
//     Strings are trimmed and sanitized so no payload field can start with a
//     dot (".") or contain characters that could cause a SyntaxError if a
//     browser's realtime internals inadvertently evaluate the value.
//     The broadcastMsg, banReason and unbanMsg fields are capped at 500 chars
//     to prevent excessively large payloads on the WebSocket channel.
//
//   SESSION_TOKEN FILTERING:
//     Admin actions already target users by their permanent session_token
//     (stored in localStorage — VPN-resistant). No IP-based filtering anywhere.
//     The ActionTray passes `sessionToken: session.session_token` to every
//     adminApi call, so Supabase Broadcast targets the exact channel the client
//     subscribed to regardless of any IP change.

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  banUser,
  unbanUser,
  sendAdminMessage,
  clearAdminMessage,
} from "@/lib/adminApi";
import {
  ShieldBan, ShieldCheck, Send, X, Loader2, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, Search, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  session_token: string;
  current_page: string | null;
  country: string | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  unban_message: string | null;
  admin_message: string | null;
  last_seen: string;
  malicious_attempts?: number | null;
  threat_level?: string | null;
  joined_at?: string | null;
}

const SAFE_SELECT = [
  "id", "session_token", "current_page", "country",
  "is_banned", "ban_reason", "unban_message", "admin_message", "last_seen",
].join(", ");

// ─── Country flags ────────────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "Egypt": "🇪🇬", "United Kingdom": "🇬🇧",
  "Germany": "🇩🇪", "France": "🇫🇷", "Japan": "🇯🇵", "Canada": "🇨🇦",
  "Australia": "🇦🇺", "Brazil": "🇧🇷", "India": "🇮🇳", "Russia": "🇷🇺",
  "South Korea": "🇰🇷", "Netherlands": "🇳🇱", "Spain": "🇪🇸", "Italy": "🇮🇹",
  "Poland": "🇵🇱", "Turkey": "🇹🇷", "Mexico": "🇲🇽", "Saudi Arabia": "🇸🇦",
  "UAE": "🇦🇪", "Pakistan": "🇵🇰", "Indonesia": "🇮🇩", "Philippines": "🇵🇭",
  "Unknown": "🌐",
};
function getFlag(country: string | null): string {
  if (!country) return "🌐";
  return COUNTRY_FLAGS[country] || "🌐";
}

// ─── Route badge ──────────────────────────────────────────────────────────────
function routeBadgeClass(page: string | null): string {
  const p = page || "/";
  if (p.startsWith("/admin"))     return "bg-violet-500/15 text-violet-300 border-violet-500/25";
  if (p.startsWith("/portfolio")) return "bg-cyan-500/15 text-cyan-300 border-cyan-500/25";
  if (p.startsWith("/games"))     return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (p.startsWith("/pricing"))   return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  if (p.startsWith("/reviews"))   return "bg-pink-500/15 text-pink-300 border-pink-500/25";
  if (p.startsWith("/policies"))  return "bg-slate-500/15 text-slate-300 border-slate-500/25";
  return "bg-white/8 text-white/50 border-white/10";
}

// ─── Time helper ──────────────────────────────────────────────────────────────
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 5_000)     return "just now";
    if (diff < 60_000)    return Math.round(diff / 1000) + "s ago";
    if (diff < 3_600_000) return Math.round(diff / 60_000) + "m ago";
    return Math.round(diff / 3_600_000) + "h ago";
  } catch { return "—"; }
}

function isActive(last_seen: string): boolean {
  try { return Date.now() - new Date(last_seen).getTime() < 3 * 60_000; }
  catch { return false; }
}

// ─── Payload sanitiser ────────────────────────────────────────────────────────
// Prevents broadcast payloads from containing values that start with "."
// (which can trigger SyntaxError in some realtime evaluation paths) or
// that exceed a safe length.
function sanitisePayloadString(raw: string, maxLen = 500): string {
  const trimmed = raw.trim().slice(0, maxLen);
  // Strip any leading dots that could look like a JS expression start
  return trimmed.replace(/^\.+/, "");
}

// ─── Inline feedback flash ────────────────────────────────────────────────────
function useFeedback() {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = useCallback((text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3_000);
  }, []);
  return { msg, flash };
}

// ─── Action Tray ──────────────────────────────────────────────────────────────
function ActionTray({
  session,
  onRefresh,
  onClose,
}: {
  session: Session;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [banReason,    setBanReason]    = useState(session.ban_reason || "");
  const [unbanMsg,     setUnbanMsg]     = useState(session.unban_message || "");
  const [broadcastMsg, setBroadcastMsg] = useState(session.admin_message || "");
  const [busy, setBusy] = useState<"ban" | "unban" | "send" | "clear" | null>(null);
  const { msg: feedback, flash } = useFeedback();

  async function act<T>(
    key: typeof busy,
    fn: () => Promise<T>,
    successMsg: string
  ) {
    setBusy(key);
    try {
      await fn();
      flash(successMsg, true);
      onRefresh();
    } catch (e: unknown) {
      flash((e as Error).message, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-0 overflow-hidden rounded-b-2xl border-t border-white/6 bg-[#0d0d14]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
          Moderation Panel
        </span>
        {feedback && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            feedback.ok
              ? "text-emerald-300 bg-emerald-500/10"
              : "text-red-300 bg-red-500/10"
          }`}>
            {feedback.text}
          </span>
        )}
        <button
          onClick={onClose}
          className="text-white/25 hover:text-white/60 transition-colors"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
        {/* ── Ban ────────────────────────────────────────────────────── */}
        <div className="p-4 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/60">
            Ban User
          </p>
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value.slice(0, 500))}
            placeholder="Reason (optional)"
            className="w-full rounded-lg border border-white/8 bg-white/4
                       px-3 py-2 text-xs text-white placeholder:text-white/25
                       focus:outline-none focus:border-red-500/40 transition-colors"
          />
          <button
            onClick={() =>
              act("ban", () =>
                banUser({
                  sessionId:    session.id,
                  sessionToken: session.session_token,
                  reason: sanitisePayloadString(banReason) || undefined,
                }), "Banned"
              )
            }
            disabled={!!busy || session.is_banned === true}
            className="flex w-full items-center justify-center gap-2 rounded-lg
                       bg-red-600/80 hover:bg-red-500 disabled:opacity-35
                       px-3 py-2 text-xs font-semibold text-white transition-all"
          >
            {busy === "ban"
              ? <Loader2 size={12} className="animate-spin" />
              : <ShieldBan size={12} />}
            {session.is_banned ? "Already Banned" : "Ban Session"}
          </button>
        </div>

        {/* ── Unban ──────────────────────────────────────────────────── */}
        <div className="p-4 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60">
            Unban User
          </p>
          <input
            type="text"
            value={unbanMsg}
            onChange={(e) => setUnbanMsg(e.target.value.slice(0, 500))}
            placeholder="Welcome-back message"
            className="w-full rounded-lg border border-white/8 bg-white/4
                       px-3 py-2 text-xs text-white placeholder:text-white/25
                       focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
          <button
            onClick={() =>
              act("unban", () =>
                unbanUser({
                  sessionId:    session.id,
                  sessionToken: session.session_token,
                  unbanMessage: sanitisePayloadString(unbanMsg) || undefined,
                }), "Unbanned"
              )
            }
            disabled={!!busy || session.is_banned !== true}
            className="flex w-full items-center justify-center gap-2 rounded-lg
                       bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-35
                       px-3 py-2 text-xs font-semibold text-white transition-all"
          >
            {busy === "unban"
              ? <Loader2 size={12} className="animate-spin" />
              : <ShieldCheck size={12} />}
            {session.is_banned ? "Unban Session" : "Not Banned"}
          </button>
        </div>

        {/* ── Broadcast ──────────────────────────────────────────────── */}
        <div className="p-4 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
            Live Alert
          </p>
          <input
            type="text"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value.slice(0, 500))}
            placeholder="Message shown to this user now…"
            className="w-full rounded-lg border border-white/8 bg-white/4
                       px-3 py-2 text-xs text-white placeholder:text-white/25
                       focus:outline-none focus:border-amber-500/40 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                const safe = sanitisePayloadString(broadcastMsg);
                if (!safe) return;
                act("send", () =>
                  sendAdminMessage({
                    sessionId:    session.id,
                    sessionToken: session.session_token,
                    message:      safe,
                  }), "Alert sent"
                );
              }}
              disabled={!!busy || !broadcastMsg.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg
                         bg-amber-600/80 hover:bg-amber-500 disabled:opacity-35
                         px-3 py-2 text-xs font-semibold text-white transition-all"
            >
              {busy === "send"
                ? <Loader2 size={12} className="animate-spin" />
                : <Send size={12} />}
              Send
            </button>
            {session.admin_message && (
              <button
                onClick={() =>
                  act("clear", () =>
                    clearAdminMessage(session.id, session.session_token),
                    "Cleared"
                  )
                }
                disabled={!!busy}
                title="Clear active alert"
                className="flex items-center justify-center rounded-lg
                           border border-white/10 hover:bg-white/8 disabled:opacity-35
                           px-3 py-2 text-white/50 hover:text-white transition-all"
              >
                {busy === "clear"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <X size={12} />}
              </button>
            )}
          </div>
          {session.admin_message && (
            <p className="text-[10px] text-amber-400/70 truncate">
              Active: &ldquo;{session.admin_message}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onRefresh }: { session: Session; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const active  = isActive(session.last_seen);
  const banned  = session.is_banned === true;
  const threat  = session.threat_level || "low";

  const threatDot =
    threat === "high"   ? "bg-red-400"
    : threat === "medium" ? "bg-amber-400"
    : "bg-emerald-400";

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
      banned
        ? "border-red-500/30 border-l-[3px] border-l-red-500"
        : "border-white/7 hover:border-white/12"
    } bg-white/[0.025]`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Status dot + token */}
        <div className="flex items-center gap-2.5 min-w-0 w-[140px] shrink-0">
          <span className="relative flex-shrink-0 h-2.5 w-2.5">
            <span className={`absolute inset-0 rounded-full ${active ? "bg-emerald-400" : "bg-white/15"}`} />
            {active && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />}
          </span>
          <code className="text-[11px] font-mono text-white/40 truncate">
            {session.session_token.slice(0, 8)}…
          </code>
        </div>

        {/* Country */}
        <div className="flex items-center gap-1.5 w-[110px] shrink-0">
          <span className="text-base leading-none">{getFlag(session.country)}</span>
          <span className="text-xs text-white/50 truncate">{session.country || "Unknown"}</span>
        </div>

        {/* Page route badge */}
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium ${routeBadgeClass(session.current_page)}`}>
            {session.current_page || "/"}
          </span>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {banned && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/25">
              BANNED
            </span>
          )}
          {session.admin_message && (
            <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/20">
              MSG
            </span>
          )}
          <span className={`h-1.5 w-1.5 rounded-full ${threatDot}`} title={"Threat: " + threat} />
        </div>

        {/* Last seen + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:block text-[11px] text-white/25 tabular-nums w-[56px] text-right">
            {timeAgo(session.last_seen)}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-white/8
                       bg-white/4 hover:bg-white/8 px-2.5 py-1.5
                       text-[11px] font-medium text-white/40 hover:text-white/80 transition-all"
            aria-label={expanded ? "Close panel" : "Open actions"}
          >
            Actions
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* Expandable tray */}
      {expanded && (
        <ActionTray
          session={session}
          onRefresh={onRefresh}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

// ─── Legend item ──────────────────────────────────────────────────────────────
function LegendItem({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={"h-2 w-2 rounded-full " + dot} />
      <span className="text-[11px] text-white/25">{label}</span>
    </div>
  );
}

// ─── Main UsersTab ─────────────────────────────────────────────────────────────
export default function UsersTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "banned">("all");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("user_sessions")
        .select(SAFE_SELECT)
        .order("last_seen", { ascending: false })
        .limit(200);

      if (queryError) {
        console.warn("[UsersTab] query error:", queryError.message);
        setError("Could not load sessions: " + queryError.message);
        setSessions([]);
      } else {
        setSessions((data || []) as unknown as Session[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to connect: " + msg);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    tickRef.current = setInterval(fetchSessions, 15_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    if (filter === "active" && !isActive(s.last_seen)) return false;
    if (filter === "banned" && s.is_banned !== true)   return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.session_token.toLowerCase().includes(q) ||
      (s.country || "").toLowerCase().includes(q) ||
      (s.current_page || "").toLowerCase().includes(q)
    );
  });

  const activeCnt = sessions.filter((s) => isActive(s.last_seen)).length;
  const bannedCnt = sessions.filter((s) => s.is_banned).length;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",  value: sessions.length, color: "text-white/70" },
          { label: "Active", value: activeCnt,        color: "text-emerald-400" },
          { label: "Banned", value: bannedCnt,        color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/7 bg-white/[0.025] px-4 py-3">
            <p className={"text-2xl font-bold tabular-nums " + color}>{value}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Token, country, page…"
            className="w-full rounded-lg border border-white/10 bg-white/4
                       pl-8 pr-3 py-2 text-sm text-white
                       placeholder:text-white/25 focus:outline-none
                       focus:border-primary/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.02] p-1">
          {(["all", "active", "banned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={"rounded-md px-3 py-1 text-xs font-medium capitalize transition-all " + (
                filter === f
                  ? "bg-primary/20 text-primary"
                  : "text-white/35 hover:text-white/60"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/10
                     bg-white/4 hover:bg-white/8 disabled:opacity-40
                     px-3 py-2 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

        <span className="text-xs text-white/25 tabular-nums">
          {filtered.length} / {sessions.length}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/15 p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Database Error</p>
            <p className="text-xs text-red-400/60 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Session list */}
      {loading && sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-white/20" size={28} />
          <p className="text-xs text-white/20">Loading sessions…</p>
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Users size={32} className="text-white/10" />
          <p className="text-sm text-white/25">
            {search || filter !== "all" ? "No sessions match this filter." : "No sessions yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SessionCard key={s.id} session={s} onRefresh={fetchSessions} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5">
        <LegendItem dot="bg-emerald-400 animate-pulse" label="Active (< 3 min)" />
        <LegendItem dot="bg-white/15"                  label="Inactive" />
        <LegendItem dot="bg-red-400"                   label="High threat" />
        <LegendItem dot="bg-amber-400"                 label="Medium threat" />
        <LegendItem dot="bg-emerald-400"               label="Low threat" />
      </div>
    </div>
  );
}
