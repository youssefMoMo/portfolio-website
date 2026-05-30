// src/pages/AdminDashboard.tsx
//
// FLAT UI PURGE: All bg-gradient-to-r gradient classes removed from tab buttons.
// Active tab: solid bg-primary (#6a87ce)
// Inactive tab: default outline variant
// Icon accent boxes in LogsTab: solid flat bg-[#27282a] border border-white/10
// Header h1: flat text-primary (no gradient text)

import React, {
  useState, useEffect, useRef, lazy, Suspense,
} from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Image, DollarSign, FileText, LogOut,
  Shield, Users, LayoutDashboard, MessageSquare,
  Trash2, RefreshCw, ScrollText, BarChart3, Gamepad2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  getErrorLogs, clearErrorLogs, type ErrorLog,
} from "@/lib/contentManager";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { isAuthenticatedSync, logout }  from "@/lib/auth";

// ── Lazy tab imports ──────────────────────────────────────────────────────────

const AnalyticsTab  = lazy(() => import(/* webpackChunkName: "page-admin-analytics"  */ "./admin/AnalyticsTab"));
const ReviewsTab    = lazy(() => import(/* webpackChunkName: "page-admin-reviews"    */ "./admin/ReviewsTab"));
const UsersTab      = lazy(() => import(/* webpackChunkName: "page-admin-users"      */ "./admin/UsersTab"));
const GamesTab      = lazy(() => import(/* webpackChunkName: "page-admin-games"      */ "./admin/GamesTab"));
const HomeTab       = lazy(() => import(/* webpackChunkName: "page-admin-home"       */ "./admin/HomeTab"));
const PoliciesTab   = lazy(() => import(/* webpackChunkName: "page-admin-policies"   */ "./admin/PoliciesTab"));
const PortfolioTab  = lazy(() => import(/* webpackChunkName: "page-admin-portfolio"  */ "./admin/PortfolioTab"));
const PricingTab    = lazy(() => import(/* webpackChunkName: "page-admin-pricing"    */ "./admin/PricingTab"));

// ── Types ─────────────────────────────────────────────────────────────────────

type TabType =
  | "analytics" | "home"     | "portfolio" | "pricing"
  | "policies"  | "reviews"  | "games"     | "users"   | "logs";

// ── Shared tab loading indicator ──────────────────────────────────────────────

const TAB_SPINNER = (
  <div className="flex items-center justify-center py-24">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
  </div>
);

// ── Log configuration ─────────────────────────────────────────────────────────

const LOG_CFG = {
  error:     { color: "bg-red-500/15 border-red-500/30",      text: "text-red-400",    icon: "🔴", label: "Error"     },
  warning:   { color: "bg-amber-500/15 border-amber-500/30",  text: "text-amber-400",  icon: "🟡", label: "Warning"   },
  network:   { color: "bg-blue-500/15 border-blue-500/30",    text: "text-blue-400",   icon: "🔵", label: "Network"   },
  unhandled: { color: "bg-purple-500/15 border-purple-500/30",text: "text-purple-400", icon: "🟣", label: "Unhandled" },
} as const;

// ── LogsTab — inline (fast path, no external deps, <4 KB) ─────────────────────

function LogsTab() {
  const { toast }  = useToast();
  const [logs,     setLogs]     = React.useState<ErrorLog[]>([]);
  const [filter,   setFilter]   = React.useState<"all" | ErrorLog["type"]>("all");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const pollRef                 = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = React.useCallback(() => { setLogs(getErrorLogs()); }, []);

  React.useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 30_000);
    return () => {
      if (pollRef.current !== null) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [refresh]);

  const handleClear = () => {
    if (!confirm("Clear all error logs?")) return;
    clearErrorLogs();
    setLogs([]);
    toast({ title: "🗑️ Logs cleared" });
  };

  const toggle = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtered = filter === "all" ? logs : logs.filter((l) => l.type === filter);
  const counts = {
    all:       logs.length,
    error:     logs.filter((l) => l.type === "error").length,
    warning:   logs.filter((l) => l.type === "warning").length,
    network:   logs.filter((l) => l.type === "network").length,
    unhandled: logs.filter((l) => l.type === "unhandled").length,
  };

  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 dark:bg-card/60 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* FLAT UI: solid icon box, no gradient */}
              <div className="p-2 rounded-lg bg-[#27282a] border border-white/10">
                <ScrollText className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Error Logs ({counts.all})</CardTitle>
                <CardDescription>Real-time monitoring · auto-refreshes every 30 s</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={refresh}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              {logs.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-2" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(["all", "error", "warning", "network", "unhandled"] as const).map((t) => {
              const cfg    = t === "all" ? null : LOG_CFG[t];
              const active = filter === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    active
                      ? t === "all"
                        ? "bg-white/15 border-white/30 text-white"
                        : `${cfg!.color} ${cfg!.text} border-current`
                      : "bg-transparent border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {cfg?.icon ?? "📋"} {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              <p className="font-semibold text-green-400 mb-1">
                {logs.length === 0 ? "No errors recorded" : "No errors match this filter"}
              </p>
              <p className="text-xs text-muted-foreground">
                The error monitor is active. Any issues on any page will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => {
                const cfg   = LOG_CFG[log.type];
                const isExp = expanded.has(log.id);
                const ts    = new Date(log.timestamp);
                return (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={`rounded-xl border p-4 ${cfg.color}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span>{cfg.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                              <code className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-muted-foreground">{log.page}</code>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-white/80 mt-0.5 line-clamp-2">{log.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-[10px] text-muted-foreground">{ts.toLocaleDateString()} {ts.toLocaleTimeString()}</p>
                          {log.stack && (
                            <button
                              onClick={() => toggle(log.id)}
                              className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-muted-foreground"
                            >
                              {isExp ? "▲ Hide" : "▼ Stack"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isExp && log.stack && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all font-mono bg-black/20 rounded p-2 max-h-32 overflow-auto">
                            {log.stack}
                          </pre>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const mountedRef   = useRef(true);

  const [activeTab, setActiveTab] = useState<TabType>("analytics");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticatedSync()) navigate("/admin");
  }, [navigate]);

  // ── Update last_login ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const sb = supabase;
    sb.auth.getUser().then(({ data: { user } }) => {
      const did = user?.user_metadata?.provider_id ?? user?.user_metadata?.sub ?? "";
      if (!did) return;
      sb.from("admin_users")
        .update({ last_login: new Date().toISOString() })
        .eq("discord_id", did)
        .then(() => {}, () => {});
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out" });
    navigate("/admin");
  };

  // ── Tab definitions ────────────────────────────────────────────────────────
  // FLAT UI: `gradient` field removed entirely.
  // Active state: bg-primary text-white
  // Inactive state: default outline variant

  const TABS: {
    id:    TabType;
    label: string;
    sub:   string;
    icon:  React.ElementType;
  }[] = [
    { id: "analytics", label: "Analytics", sub: "Stats & trends",     icon: BarChart3     },
    { id: "home",      label: "Home",      sub: "Hero & stats",       icon: Home          },
    { id: "portfolio", label: "Portfolio", sub: "Your projects",      icon: Image         },
    { id: "pricing",   label: "Pricing",   sub: "Plans & packages",   icon: DollarSign    },
    { id: "reviews",   label: "Reviews",   sub: "Moderation queue",   icon: MessageSquare },
    { id: "policies",  label: "Policies",  sub: "Terms & conditions", icon: FileText      },
    { id: "games",     label: "Games",     sub: "Roblox games",       icon: Gamepad2      },
    { id: "users",     label: "Users",     sub: "Ban management",     icon: Users         },
    { id: "logs",      label: "Logs",      sub: "Error monitor",      icon: ScrollText    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            {/* FLAT UI: plain text-primary heading, no gradient text */}
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-primary">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Manage your website ·{" "}
              {isSupabaseEnabled ? "🗄️ Supabase" : "💾 Local"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        {/* ── Tab strip ────────────────────────────────────────────────────── */}
        {/*
          FLAT UI ENFORCEMENT:
          Active:   solid bg-primary text-white border-transparent — no gradient
          Inactive: standard outline (bg-transparent border-white/10)
          The icon box next to the label also uses a flat bg-primary/15 tint.
        */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-8">
          {TABS.map(({ id, label, sub, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  h-auto py-2.5 px-2 gap-1.5 flex flex-col items-center text-center
                  rounded-md border text-sm font-medium
                  transition-colors duration-150
                  ${active
                    ? "bg-primary text-white border-transparent shadow-md"
                    : "bg-transparent border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white hover:border-white/20"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div>
                  <div className="font-semibold text-[11px] leading-tight">{label}</div>
                  <div className="text-[9px] opacity-75 leading-tight hidden sm:block">{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {activeTab === "analytics" && (
            <Suspense key="analytics" fallback={TAB_SPINNER}>
              <AnalyticsTab />
            </Suspense>
          )}

          {activeTab === "home" && (
            <Suspense key="home" fallback={TAB_SPINNER}>
              <HomeTab />
            </Suspense>
          )}

          {activeTab === "portfolio" && (
            <Suspense key="portfolio" fallback={TAB_SPINNER}>
              <PortfolioTab />
            </Suspense>
          )}

          {activeTab === "pricing" && (
            <Suspense key="pricing" fallback={TAB_SPINNER}>
              <PricingTab />
            </Suspense>
          )}

          {activeTab === "reviews" && (
            <Suspense key="reviews" fallback={TAB_SPINNER}>
              <ReviewsTab />
            </Suspense>
          )}

          {activeTab === "policies" && (
            <Suspense key="policies" fallback={TAB_SPINNER}>
              <PoliciesTab />
            </Suspense>
          )}

          {activeTab === "games" && (
            <Suspense key="games" fallback={TAB_SPINNER}>
              <GamesTab />
            </Suspense>
          )}

          {activeTab === "users" && (
            <Suspense key="users" fallback={TAB_SPINNER}>
              <UsersTab />
            </Suspense>
          )}

          {activeTab === "logs" && <LogsTab key="logs" />}

        </AnimatePresence>
      </div>
    </div>
  );
}
