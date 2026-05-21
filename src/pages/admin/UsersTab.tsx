// src/pages/admin/UsersTab.tsx
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  USERS & ANALYTICS — Live Threat Detection Dashboard                   ║
// ║                                                                          ║
// ║  Layout:                                                                 ║
// ║    Top: 4 KPI cards (Total · Active · Threats · Banned)                ║
// ║    Mid: [A] Geographic Entry Log | Live Session Table                   ║
// ║    Bot: [B] Clickstream Journey  | [C] Attack Attempt Log              ║
// ║                                                                          ║
// ║  Data source: public.user_sessions (Supabase + Realtime channel)        ║
// ║  Run supabase-user-sessions.sql to activate.                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Globe, RefreshCcw, Shield, AlertTriangle, Ban,
  CheckCircle2, ChevronRight, Activity, Clock, Eye,
  Zap, Lock, Map, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sessionsApi, type UserSession } from "@/lib/adminApi";
import { supabase } from "@/lib/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  "Egypt": "🇪🇬", "United States": "🇺🇸", "United Kingdom": "🇬🇧",
  "Germany": "🇩🇪", "France": "🇫🇷", "Saudi Arabia": "🇸🇦",
  "United Arab Emirates": "🇦🇪", "Turkey": "🇹🇷", "Japan": "🇯🇵",
  "Canada": "🇨🇦", "Australia": "🇦🇺", "India": "🇮🇳",
  "Brazil": "🇧🇷", "Netherlands": "🇳🇱", "Russia": "🇷🇺",
  "Unknown": "🌐",
};

function countryFlag(country: string | null): string {
  if (!country) return "🌐";
  return COUNTRY_FLAGS[country] ?? "🌐";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function isActive(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

const THREAT_CONFIG = {
  low:    { label: "Low",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  medium: { label: "Medium", color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20"  },
  high:   { label: "High",   color: "text-red-400",     bg: "bg-red-500/10    border-red-500/20"    },
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: number | string;
  icon: React.ElementType; accent: string; sub?: string;
}) {
  return (
    <Card className="bg-card/50 border-white/8 backdrop-blur-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Geographic Entry Log ────────────────────────────────────────────────────

function GeoEntryLog({ sessions }: { sessions: UserSession[] }) {
  const countMap: Record<string, { count: number; active: number }> = {};
  for (const s of sessions) {
    const c = s.country ?? "Unknown";
    if (!countMap[c]) countMap[c] = { count: 0, active: 0 };
    countMap[c].count++;
    if (isActive(s.last_seen)) countMap[c].active++;
  }
  const rows = Object.entries(countMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  const maxCount = rows[0]?.[1].count ?? 1;

  return (
    <div className="space-y-1.5">
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-6">
          No sessions recorded yet
        </p>
      )}
      {rows.map(([country, { count, active }]) => (
        <div key={country} className="flex items-center gap-2.5 group">
          <span className="text-lg w-7 flex-shrink-0">{countryFlag(country)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-foreground truncate">{country}</span>
              <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0 tabular-nums">
                {count} {active > 0 && <span className="text-emerald-400">({active} live)</span>}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-cyan-500/60"
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Clickstream Journey ─────────────────────────────────────────────────────

function ClickstreamJourney({ session }: { session: UserSession | null }) {
  if (!session) {
    return (
      <p className="text-muted-foreground text-sm text-center py-6">
        Select a session row to view its clickstream journey
      </p>
    );
  }

  const path = session.clickstream_path ?? [];
  if (path.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No path recorded.</p>;
  }

  // Compute rough time deltas (based on join time, spread evenly)
  const totalSec =
    Math.floor((new Date(session.last_seen).getTime() - new Date(session.joined_at).getTime()) / 1000);
  const stepSec = path.length > 1 ? Math.floor(totalSec / (path.length - 1)) : 0;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max">
        {path.map((page, i) => {
          const isAttack = page.includes("/admin");
          const isLast   = i === path.length - 1;
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border
                    ${isAttack
                      ? "bg-red-500/15 border-red-500/40 text-red-400"
                      : "bg-primary/10 border-primary/20 text-primary"
                    }`}
                >
                  {isAttack ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[9px] font-mono text-center max-w-[80px] truncate
                  ${isAttack ? "text-red-400" : "text-muted-foreground"}`}>
                  {page === "/" ? "Home" : page.replace("/", "")}
                </span>
                {i > 0 && (
                  <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                    {(stepSec * i)}s
                  </span>
                )}
              </div>
              {!isLast && (
                <div className={`w-6 sm:w-10 h-px mt-[-18px] flex-shrink-0
                  ${isAttack ? "bg-red-500/30" : "bg-primary/20"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Security Attack Log ─────────────────────────────────────────────────────

function AttackLog({ sessions }: { sessions: UserSession[] }) {
  const threats = sessions.filter(
    (s) => s.threat_level !== "low" || (s.malicious_attempts?.length ?? 0) > 0,
  );

  if (threats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Shield className="w-8 h-8 text-emerald-500/40" />
        <p className="text-muted-foreground text-sm">No threats detected — all clear</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
      {threats.map((s) => {
        const cfg = THREAT_CONFIG[s.threat_level];
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-xl border ${cfg.bg} ${
              s.threat_level === "high" ? "animate-pulse-border" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
              <span className={`text-xs font-semibold ${cfg.color}`}>
                {s.threat_level.toUpperCase()} THREAT
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0 font-mono">
                {s.session_token.slice(0, 8)}…
              </span>
            </div>
            <div className="space-y-0.5">
              {(s.malicious_attempts ?? []).map((attempt, i) => (
                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                  • {attempt}
                </p>
              ))}
              {(s.malicious_attempts ?? []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Medium threat flag — {s.current_page}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground">
                {countryFlag(s.country)} {s.country ?? "Unknown"} ·{" "}
                {timeAgo(s.last_seen)}
              </span>
              {s.is_banned && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                  BANNED
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Session Row ─────────────────────────────────────────────────────────────

function SessionRow({
  session, selected, onSelect, onAction,
}: {
  session: UserSession;
  selected: boolean;
  onSelect: () => void;
  onAction: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const active = isActive(session.last_seen);
  const cfg    = THREAT_CONFIG[session.threat_level];

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (session.is_banned) {
        await sessionsApi.unban(session.id);
        toast({ title: "✅ Session unbanned" });
      } else {
        await sessionsApi.ban(session.id);
        toast({ title: "🚫 Session banned" });
      }
      onAction();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "❌ Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={`border-b border-white/5 cursor-pointer transition-colors text-sm
        ${selected ? "bg-primary/8" : "hover:bg-white/3"}
        ${session.threat_level === "high" ? "bg-red-500/3" : ""}
        ${session.is_banned ? "opacity-60" : ""}
      `}
    >
      {/* Session ID */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-400" : "bg-zinc-600"}`} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {session.session_token.slice(0, 8)}…
          </span>
        </div>
      </td>

      {/* Country */}
      <td className="px-3 py-2.5">
        <span className="text-xs">{countryFlag(session.country)} {session.country ?? "Unknown"}</span>
      </td>

      {/* Join time */}
      <td className="px-3 py-2.5">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {new Date(session.joined_at).toLocaleTimeString("en-US", { hour12: false })}
        </span>
      </td>

      {/* Current page */}
      <td className="px-3 py-2.5 max-w-[120px]">
        <span className="text-[11px] font-mono text-primary/80 truncate block">
          {session.current_page ?? "/"}
        </span>
      </td>

      {/* Threat */}
      <td className="px-3 py-2.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </td>

      {/* Ban toggle */}
      <td className="px-3 py-2.5">
        <Button
          size="sm" variant="ghost" disabled={busy}
          onClick={toggle}
          className={`h-6 px-2 text-[10px] gap-1 ${
            session.is_banned
              ? "text-emerald-400 hover:bg-emerald-500/10"
              : "text-red-400   hover:bg-red-500/10"
          }`}
        >
          {busy
            ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            : session.is_banned
            ? <><CheckCircle2 className="w-3 h-3" /> Unban</>
            : <><Ban className="w-3 h-3" /> Ban</>}
        </Button>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UsersTab() {
  const { toast }                       = useToast();
  const [sessions,  setSessions]        = useState<UserSession[]>([]);
  const [total,     setTotal]           = useState(0);
  const [loading,   setLoading]         = useState(true);
  const [selected,  setSelected]        = useState<UserSession | null>(null);
  const [page,      setPage]            = useState(1);
  const mountedRef                      = useRef(true);

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sessionsApi.list(page);
      if (!mountedRef.current) return;
      setSessions(res.sessions);
      setTotal(res.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "❌ Failed to load sessions", description: msg, variant: "destructive" });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("admin:user_sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, () => {
        if (mountedRef.current) load();
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [load]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCount  = sessions.filter((s) => isActive(s.last_seen)).length;
  const threatCount  = sessions.filter((s) => s.threat_level !== "low").length;
  const bannedCount  = sessions.filter((s) => s.is_banned).length;
  const totalPages   = Math.ceil(total / 30);

  return (
    <motion.div
      key="users-analytics"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Analytics & Threat Monitor</h2>
            <p className="text-xs text-muted-foreground">Live session tracking · Auto-updates via Supabase Realtime</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Sessions"  value={total}       icon={Users}         accent="bg-indigo-500/80"  sub="all time" />
        <KpiCard label="Active Now"      value={activeCount} icon={Eye}           accent="bg-emerald-500/80" sub="last 10 min" />
        <KpiCard label="Threat Flags"    value={threatCount} icon={AlertTriangle} accent="bg-amber-500/80"  sub="medium + high" />
        <KpiCard label="Banned Sessions" value={bannedCount} icon={Lock}          accent="bg-red-500/80"    sub="permanently blocked" />
      </div>

      {/* ── Mid: Geo + Live Table ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">

        {/* [A] Geographic Entry Log */}
        <Card className="bg-card/50 border-white/8 backdrop-blur-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Map className="w-4 h-4 text-cyan-400" />
              <span>Geographic Entry Log</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : (
              <GeoEntryLog sessions={sessions} />
            )}
          </CardContent>
        </Card>

        {/* Live Session Table */}
        <Card className="bg-card/50 border-white/8 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Live Session Log</span>
              {activeCount > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {activeCount} LIVE
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Session", "Country", "Joined", "Current Page", "Threat", "Action"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12">
                      <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
                    </td></tr>
                  ) : sessions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No sessions recorded yet
                    </td></tr>
                  ) : (
                    sessions.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        selected={selected?.id === s.id}
                        onSelect={() => setSelected(selected?.id === s.id ? null : s)}
                        onAction={load}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-3 px-4">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ← Prev
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom: Clickstream + Attack Log ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* [B] Clickstream Journey */}
        <Card className="bg-card/50 border-white/8 backdrop-blur-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>User Behavior Journey</span>
              {selected && (
                <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                  {selected.session_token.slice(0, 8)}…
                </span>
              )}
            </CardTitle>
            {!selected && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click a session row above to view its clickstream
              </p>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected?.id ?? "empty"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <ClickstreamJourney session={selected} />
              </motion.div>
            </AnimatePresence>

            {/* Selected session detail */}
            {selected && (
              <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Country",    value: `${countryFlag(selected.country)} ${selected.country ?? "Unknown"}` },
                  { label: "Joined",     value: new Date(selected.joined_at).toLocaleTimeString("en-US", { hour12: false }) },
                  { label: "Last Seen",  value: timeAgo(selected.last_seen) },
                  { label: "Pages Visited", value: String(selected.clickstream_path?.length ?? 0) },
                  { label: "Attacks",    value: String(selected.malicious_attempts?.length ?? 0) },
                  { label: "Status",     value: selected.is_banned ? "🔴 Banned" : isActive(selected.last_seen) ? "🟢 Active" : "⚫ Idle" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-xs font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* [C] Security & Attack Log */}
        <Card className="bg-card/50 border-white/8 backdrop-blur-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              <span>Security & Attack Attempt Log</span>
              {threatCount > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-bold">
                  {threatCount} ALERTS
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
              </div>
            ) : (
              <AttackLog sessions={sessions} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schema notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-300/70">
        <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
        <div>
          <span className="font-semibold text-indigo-300">Setup required:</span>{" "}
          Run <code className="font-mono bg-indigo-500/10 px-1 rounded">supabase-user-sessions.sql</code> in
          Supabase → SQL Editor to create the <code className="font-mono bg-indigo-500/10 px-1 rounded">user_sessions</code> table.
          The tracker hook activates automatically on your next deploy.
        </div>
      </div>
    </motion.div>
  );
}
