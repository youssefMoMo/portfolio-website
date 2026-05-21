"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  banUser,
  unbanUser,
  sendAdminMessage,
  clearAdminMessage,
} from "@/lib/adminApi";
import {
  ShieldBan,
  ShieldCheck,
  Send,
  Trash2,
  Loader2,
  Globe,
  Monitor,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  session_token: string;
  current_page: string | null;
  country: string | null;
  country_code: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  unban_message: string | null;
  admin_message: string | null;
  malicious_attempts: number | null;
  threat_level: string | null;
  last_seen: string;
  joined_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

// ─── Row Action Panel ─────────────────────────────────────────────────────────
function SessionActionPanel({
  session,
  onRefresh,
}: {
  session: Session;
  onRefresh: () => void;
}) {
  const [banReason, setBanReason] = useState(session.ban_reason ?? "");
  const [unbanMsg, setUnbanMsg] = useState(session.unban_message ?? "");
  const [broadcastMsg, setBroadcastMsg] = useState(
    session.admin_message ?? ""
  );
  const [loading, setLoading] = useState<
    "ban" | "unban" | "send" | "clear" | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleBan() {
    setLoading("ban");
    try {
      await banUser({ sessionId: session.id, reason: banReason.trim() || undefined });
      flash("✓ User banned");
      onRefresh();
    } catch (e: unknown) {
      flash(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleUnban() {
    setLoading("unban");
    try {
      await unbanUser({
        sessionId: session.id,
        unbanMessage: unbanMsg.trim() || undefined,
      });
      flash("✓ User unbanned");
      onRefresh();
    } catch (e: unknown) {
      flash(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleBroadcast() {
    if (!broadcastMsg.trim()) return;
    setLoading("send");
    try {
      await sendAdminMessage({
        sessionId: session.id,
        message: broadcastMsg.trim(),
      });
      flash("✓ Message sent");
      onRefresh();
    } catch (e: unknown) {
      flash(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleClearBroadcast() {
    setLoading("clear");
    try {
      await clearAdminMessage(session.id);
      setBroadcastMsg("");
      flash("✓ Message cleared");
      onRefresh();
    } catch (e: unknown) {
      flash(`✗ ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
      {feedback && (
        <p className="text-xs font-medium text-emerald-400">{feedback}</p>
      )}

      {/* ── Ban ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Ban Reason
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="e.g. Spamming, abuse, suspected bot…"
            className="flex-1 rounded-lg border border-white/10 bg-white/5
                       px-3 py-2 text-sm text-white placeholder:text-white/30
                       focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
          <button
            onClick={handleBan}
            disabled={!!loading || session.is_banned}
            className="flex items-center gap-1.5 rounded-lg bg-red-600/80
                       hover:bg-red-600 disabled:opacity-40 px-3 py-2
                       text-sm font-medium text-white transition-colors"
          >
            {loading === "ban" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldBan size={14} />
            )}
            Ban
          </button>
        </div>
      </div>

      {/* ── Unban ───────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Unban Welcome Message
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={unbanMsg}
            onChange={(e) => setUnbanMsg(e.target.value)}
            placeholder="e.g. You're welcome back! Please review our policies."
            className="flex-1 rounded-lg border border-white/10 bg-white/5
                       px-3 py-2 text-sm text-white placeholder:text-white/30
                       focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <button
            onClick={handleUnban}
            disabled={!!loading || !session.is_banned}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700/80
                       hover:bg-emerald-700 disabled:opacity-40 px-3 py-2
                       text-sm font-medium text-white transition-colors"
          >
            {loading === "unban" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            Unban
          </button>
        </div>
      </div>

      {/* ── Admin Broadcast ──────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Send Warning / Live Message
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            placeholder="Broadcast a message visible to this user right now…"
            className="flex-1 rounded-lg border border-white/10 bg-white/5
                       px-3 py-2 text-sm text-white placeholder:text-white/30
                       focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
          <button
            onClick={handleBroadcast}
            disabled={!!loading || !broadcastMsg.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600/80
                       hover:bg-amber-600 disabled:opacity-40 px-3 py-2
                       text-sm font-medium text-white transition-colors"
          >
            {loading === "send" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Send
          </button>
          <button
            onClick={handleClearBroadcast}
            disabled={!!loading || !session.admin_message}
            title="Clear active message"
            className="flex items-center gap-1.5 rounded-lg border border-white/10
                       hover:bg-white/10 disabled:opacity-40 px-3 py-2
                       text-sm font-medium text-white/60 transition-colors"
          >
            {loading === "clear" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
        {session.admin_message && (
          <p className="text-xs text-amber-400/80">
            Active message: &ldquo;{session.admin_message}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({
  session,
  onRefresh,
}: {
  session: Session;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const threatColor =
    session.threat_level === "high"
      ? "text-red-400"
      : session.threat_level === "medium"
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        session.is_banned
          ? "border-red-500/30 bg-red-950/20"
          : "border-white/8 bg-white/3"
      }`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Token */}
        <code className="text-[11px] text-white/40 font-mono truncate max-w-[120px]">
          {session.session_token.slice(0, 12)}…
        </code>

        {/* Page */}
        <div className="flex items-center gap-1 text-xs text-white/60">
          <Monitor size={12} />
          <span>{session.current_page ?? "/"}</span>
        </div>

        {/* Country */}
        {session.country && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <Globe size={12} />
            <span>
              {session.country_code && (
                <span className="mr-1">{session.country_code}</span>
              )}
              {session.country}
            </span>
          </div>
        )}

        {/* Last seen */}
        <div className="flex items-center gap-1 text-xs text-white/40">
          <Clock size={12} />
          <span>{timeAgo(session.last_seen)}</span>
        </div>

        {/* Threat level */}
        <span className={`text-xs font-semibold ${threatColor}`}>
          {session.threat_level ?? "low"}
        </span>

        {/* Ban badge */}
        {session.is_banned && (
          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-400 ring-1 ring-red-500/30">
            BANNED
          </span>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-xs text-white/30 hover:text-white/70 transition-colors"
        >
          {expanded ? "Hide actions ▲" : "Actions ▼"}
        </button>
      </div>

      {/* Action panel */}
      {expanded && (
        <SessionActionPanel session={session} onRefresh={onRefresh} />
      )}
    </div>
  );
}

// ─── Main UsersTab ────────────────────────────────────────────────────────────
export default function UsersTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_sessions")
      .select(
        "id, session_token, current_page, country, country_code, is_banned, ban_reason, unban_message, admin_message, malicious_attempts, threat_level, last_seen, joined_at"
      )
      .order("last_seen", { ascending: false })
      .limit(200);

    if (!error && data) setSessions(data as Session[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();

    // Auto-refresh every 15 s
    const t = setInterval(fetchSessions, 15_000);
    return () => clearInterval(t);
  }, []);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.session_token.includes(q) ||
      (s.country ?? "").toLowerCase().includes(q) ||
      (s.current_page ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by token, country, page…"
          className="flex-1 max-w-sm rounded-lg border border-white/10
                     bg-white/5 px-3 py-2 text-sm text-white
                     placeholder:text-white/30 focus:outline-none
                     focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={fetchSessions}
          className="flex items-center gap-1.5 rounded-lg border border-white/10
                     bg-white/5 hover:bg-white/10 px-3 py-2 text-sm
                     text-white/60 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "↺"}
          Refresh
        </button>
        <span className="text-xs text-white/30">{filtered.length} sessions</span>
      </div>

      {/* Session list */}
      {loading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-white/30" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-20 text-sm text-white/30">
          No sessions found.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SessionRow key={s.id} session={s} onRefresh={fetchSessions} />
          ))}
        </div>
      )}
    </div>
  );
}
