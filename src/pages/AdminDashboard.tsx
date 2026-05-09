// src/pages/AdminDashboard.tsx — Refactored orchestrator (clean, modular)
// All heavy tab logic lives in src/pages/admin/*.tsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Image,
  DollarSign,
  FileText,
  LogOut,
  Save,
  Plus,
  Trash2,
  Shield,
  Users,
  Clock,
  LayoutDashboard,
  Palette,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Tag,
  X,
  Upload,
  Loader2,
  Star,
  AlertTriangle,
  Zap,
  Layers,
  Gem,
  Crown,
  Infinity,
  FileInput,
  Gamepad2,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  getContent,
  saveContent,
  HomeContent,
  PortfolioContent,
  PricingContent,
  PoliciesContent,
  PortfolioItem,
  PricingPlan,
  Policy,
  subscribeToContentUpdates,
  getErrorLogs,
  clearErrorLogs,
  ErrorLog,
} from "@/lib/contentManager";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { isAuthenticatedSync, logout } from "@/lib/auth";

// Lazy-load new tab modules
const AnalyticsTab = lazy(() => import("./admin/AnalyticsTab"));
const ReviewsTab = lazy(() => import("./admin/ReviewsTab"));
const UsersTab = lazy(() => import("./admin/UsersTab"));
const GamesTab = lazy(() => import("./admin/GamesTab"));

type TabType =
  | "analytics"
  | "home"
  | "portfolio"
  | "pricing"
  | "policies"
  | "reviews"
  | "games"
  | "users"
  | "logs";

const MAX_PORTFOLIO_ITEMS = 35;

const PRICING_ICONS = [
  { value: "zap", label: "Zap", icon: Zap },
  { value: "layers", label: "Layers", icon: Layers },
  { value: "gem", label: "Gem", icon: Gem },
  { value: "crown", label: "Crown", icon: Crown },
  { value: "infinity", label: "Infinity", icon: Infinity },
  { value: "file-import", label: "File Import", icon: FileInput },
];

const TAB_SPINNER = (
  <div className="flex items-center justify-center py-24">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
  </div>
);

// ── Logs tab (kept inline, lightweight) ───────────────────────
const LOG_CFG = {
  error: {
    color: "bg-red-500/15 border-red-500/30",
    text: "text-red-400",
    icon: "🔴",
    label: "Error",
  },
  warning: {
    color: "bg-amber-500/15 border-amber-500/30",
    text: "text-amber-400",
    icon: "🟡",
    label: "Warning",
  },
  network: {
    color: "bg-blue-500/15 border-blue-500/30",
    text: "text-blue-400",
    icon: "🔵",
    label: "Network",
  },
  unhandled: {
    color: "bg-purple-500/15 border-purple-500/30",
    text: "text-purple-400",
    icon: "🟣",
    label: "Unhandled",
  },
} as const;

function LogsTab() {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<ErrorLog[]>([]);
  const [filter, setFilter] = React.useState<"all" | ErrorLog["type"]>("all");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setLogs(getErrorLogs());
  }, []);

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
  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.type === filter);
  const counts = {
    all: logs.length,
    error: logs.filter((l) => l.type === "error").length,
    warning: logs.filter((l) => l.type === "warning").length,
    network: logs.filter((l) => l.type === "network").length,
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
      <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600">
                <ScrollText className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Error Logs ({counts.all})
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of all site pages
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setLogs(getErrorLogs())}
              >
                <ScrollText className="w-4 h-4" /> Refresh
              </Button>
              {logs.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleClear}
                >
                  <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(["all", "error", "warning", "network", "unhandled"] as const).map(
              (t) => {
                const cfg = t === "all" ? null : LOG_CFG[t];
                const active = filter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? (t === "all" ? "bg-white/15 border-white/30 text-white" : `${cfg!.color} ${cfg!.text} border-current`) : "bg-transparent border-white/10 text-muted-foreground hover:border-white/20"}`}
                  >
                    {cfg?.icon ?? "📋"} {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
                    ({counts[t]})
                  </button>
                );
              },
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
              <p className="font-semibold text-green-400 mb-1">
                {logs.length === 0
                  ? "No errors recorded"
                  : "No errors match this filter"}
              </p>
              <p className="text-xs text-muted-foreground">
                The error monitor is active. Any issues on any page will appear
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => {
                const cfg = LOG_CFG[log.type];
                const isExp = expanded.has(log.id);
                const ts = new Date(log.timestamp);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={`rounded-xl border p-4 ${cfg.color}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span>{cfg.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}
                              >
                                {cfg.label}
                              </span>
                              <code className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-muted-foreground">
                                {log.page}
                              </code>
                            </div>
                            <p className="text-xs text-white/80 mt-0.5 line-clamp-2">
                              {log.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            {ts.toLocaleDateString()} {ts.toLocaleTimeString()}
                          </p>
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

// ── Main Dashboard ─────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Content state
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);
  const [portfolioContent, setPortfolioContent] =
    useState<PortfolioContent | null>(null);
  const [pricingContent, setPricingContent] = useState<PricingContent | null>(
    null,
  );
  const [policiesContent, setPoliciesContent] =
    useState<PoliciesContent | null>(null);
  const [uploadingImages, setUploadingImages] = useState<
    Record<string | number, boolean>
  >({});
  const [previewImages, setPreviewImages] = useState<
    Record<string | number, string>
  >({});

  // Auth guard
  useEffect(() => {
    if (!isAuthenticatedSync()) navigate("/admin");
  }, [navigate]);

  // Update last_login via Supabase session
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const sb = supabase;
    sb.auth.getUser().then(({ data: { user } }) => {
      const did =
        user?.user_metadata?.provider_id ?? user?.user_metadata?.sub ?? "";
      if (!did) return;
      sb.from("admin_users")
        .update({ last_login: new Date().toISOString() })
        .eq("discord_id", did)
        .then(
          () => {},
          () => {},
        );
    });
  }, []);

  // Load content + realtime subscriptions
  useEffect(() => {
    let mounted = true;
    loadContent();
    const unsubs: (() => void)[] = [];
    if (isSupabaseEnabled) {
      unsubs.push(
        subscribeToContentUpdates("home", (d) => {
          if (mounted) setHomeContent(d as HomeContent);
        }),
        subscribeToContentUpdates("portfolio", (d) => {
          if (mounted) setPortfolioContent(d as PortfolioContent);
        }),
        subscribeToContentUpdates("pricing", (d) => {
          if (mounted) setPricingContent(d as PricingContent);
        }),
        subscribeToContentUpdates("policies", (d) => {
          if (mounted) setPoliciesContent(d as PoliciesContent);
        }),
      );
    }
    return () => {
      mounted = false;
      unsubs.forEach((u) => u());
    };
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const timeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
        Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);

      const [home, portfolio, pricing, policies] = await Promise.all([
        timeout(getContent("home"), 10000, null as any),
        timeout(getContent("portfolio"), 10000, null as any),
        timeout(getContent("pricing"), 10000, null as any),
        timeout(getContent("policies"), 10000, null as any),
      ]);

      setHomeContent(home ?? null);
      setPortfolioContent(portfolio ?? null);
      setPricingContent(pricing ?? null);
      setPoliciesContent(policies ?? null);
    } catch {
      /* fallthrough — content may already be set via realtime */
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (itemId: string | number, file: File) => {
    setUploadingImages((p) => ({ ...p, [itemId]: true }));
    try {
      if (isSupabaseEnabled && supabase) {
        const ext = file.name.split(".").pop();
        const path = `${itemId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("portfolio-images")
          .upload(path, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const {
          data: { publicUrl },
        } = supabase.storage.from("portfolio-images").getPublicUrl(path);
        if (portfolioContent) {
          setPortfolioContent({
            ...portfolioContent,
            items: portfolioContent.items.map((i) =>
              i.id === itemId ? { ...i, image: publicUrl } : i,
            ),
          });
          setHasChanges(true);
        }
        toast({ title: "✅ Image uploaded" });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          if (portfolioContent) {
            setPortfolioContent({
              ...portfolioContent,
              items: portfolioContent.items.map((i) =>
                i.id === itemId ? { ...i, image: b64 } : i,
              ),
            });
            setHasChanges(true);
          }
          setUploadingImages((p) => ({ ...p, [itemId]: false }));
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingImages((p) => ({ ...p, [itemId]: false }));
  };

  const handlePreviewImage = (file: File, id: string | number) => {
    const r = new FileReader();
    r.onloadend = () =>
      setPreviewImages((p) => ({ ...p, [id]: r.result as string }));
    r.readAsDataURL(file);
  };

  const save = async (
    type: "home" | "portfolio" | "pricing" | "policies",
    content: unknown,
  ) => {
    setIsSaving(true);
    try {
      const ok = await saveContent(type, content as any);
      toast({
        title: ok ? "✅ Saved" : "⚠️ Saved locally",
        variant: ok ? "default" : "destructive",
      });
      if (ok) {
        setHasChanges(false);
        await loadContent();
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const moveUp = <T extends { id: string | number; display_order?: number }>(
    items: T[],
    idx: number,
  ): T[] => {
    if (idx === 0) return items;
    const a = [...items];
    [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
    setHasChanges(true);
    return a.map((x, i) => ({ ...x, display_order: i }));
  };

  const moveDown = <T extends { id: string | number; display_order?: number }>(
    items: T[],
    idx: number,
  ): T[] => {
    if (idx === items.length - 1) return items;
    const a = [...items];
    [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
    setHasChanges(true);
    return a.map((x, i) => ({ ...x, display_order: i }));
  };

  const addPortfolioItem = () => {
    if (!portfolioContent) return;
    if (portfolioContent.items.length >= MAX_PORTFOLIO_ITEMS) {
      toast({
        title: `Max ${MAX_PORTFOLIO_ITEMS} items`,
        variant: "destructive",
      });
      return;
    }
    const item: PortfolioItem = {
      id: crypto.randomUUID(),
      title: "New Project",
      image: "/images/portfolio/work.png",
      category: "UI Design",
      display_order: portfolioContent.items.length,
      is_published: true,
    };
    setPortfolioContent({
      ...portfolioContent,
      items: [...portfolioContent.items, item],
    });
    setHasChanges(true);
  };

  const addPricingPlan = () => {
    if (!pricingContent) return;
    const plan: PricingPlan = {
      id: crypto.randomUUID(),
      name: "New Plan",
      price_usd: "0",
      price_robux: "0",
      frames: "Includes: 0 frames",
      features: [],
      featured: false,
      icon: "zap",
      display_order: pricingContent.plans.length,
      is_published: true,
    };
    setPricingContent({
      ...pricingContent,
      plans: [...pricingContent.plans, plan],
    });
    setHasChanges(true);
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out" });
    navigate("/admin");
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
      </div>
    );

  // ── Tab definitions ────────────────────────────────────────
  const TABS: {
    id: TabType;
    label: string;
    sub: string;
    icon: React.ElementType;
    gradient: string;
  }[] = [
    {
      id: "analytics",
      label: "Analytics",
      sub: "Stats & trends",
      icon: BarChart3,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      id: "home",
      label: "Home",
      sub: "Hero & stats",
      icon: Home,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      sub: "Your projects",
      icon: Image,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      id: "pricing",
      label: "Pricing",
      sub: "Plans & packages",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      id: "reviews",
      label: "Reviews",
      sub: "Moderation queue",
      icon: MessageSquare,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      id: "policies",
      label: "Policies",
      sub: "Terms & conditions",
      icon: FileText,
      gradient: "from-orange-500 to-red-500",
    },
    {
      id: "games",
      label: "Games",
      sub: "Roblox games",
      icon: Gamepad2,
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      id: "users",
      label: "Users",
      sub: "Ban management",
      icon: Users,
      gradient: "from-indigo-500 to-violet-600",
    },
    {
      id: "logs",
      label: "Logs",
      sub: "Error monitor",
      icon: ScrollText,
      gradient: "from-red-500 to-rose-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
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

        {/* Tab strip */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-8">
          {TABS.map(({ id, label, sub, icon: Icon, gradient }) => {
            const active = activeTab === id;
            return (
              <Button
                key={id}
                variant={active ? "default" : "outline"}
                onClick={() => setActiveTab(id)}
                className={`h-auto py-2.5 px-2 gap-1.5 flex-col items-center text-center transition-all duration-300 ${active ? `bg-gradient-to-r ${gradient} text-white shadow-lg border-transparent` : "hover:shadow-md"}`}
              >
                <Icon className="w-4 h-4" />
                <div>
                  <div className="font-semibold text-[11px] leading-tight">
                    {label}
                  </div>
                  <div className="text-[9px] opacity-75 leading-tight hidden sm:block">
                    {sub}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* ── Analytics ── */}
          {activeTab === "analytics" && (
            <Suspense key="analytics" fallback={TAB_SPINNER}>
              <AnalyticsTab />
            </Suspense>
          )}

          {/* ── Reviews ── */}
          {activeTab === "reviews" && (
            <Suspense key="reviews" fallback={TAB_SPINNER}>
              <ReviewsTab />
            </Suspense>
          )}

          {/* ── Games ── */}
          {activeTab === "games" && (
            <Suspense key="games" fallback={TAB_SPINNER}>
              <GamesTab />
            </Suspense>
          )}

          {/* ── Users ── */}
          {activeTab === "users" && (
            <Suspense key="users" fallback={TAB_SPINNER}>
              <UsersTab />
            </Suspense>
          )}

          {/* ── Logs ── */}
          {activeTab === "logs" && <LogsTab key="logs" />}

          {/* ── Home content ── */}
          {activeTab === "home" && homeContent && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        Home Page Content
                      </CardTitle>
                      <CardDescription>
                        Edit hero section & stats
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { label: "Hero Badge", key: "hero_badge" as const },
                      { label: "Hero Title 1", key: "hero_title1" as const },
                    ].map(({ label, key }) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium">{label}</label>
                        <Input
                          value={(homeContent as any)[key] ?? ""}
                          onChange={(e) =>
                            setHomeContent({
                              ...homeContent,
                              [key]: e.target.value,
                            })
                          }
                          className="bg-background/50 border-white/10"
                        />
                      </div>
                    ))}
                  </div>
                  {(
                    [
                      "hero_title2",
                      "hero_subtitle",
                      "cta_title",
                      "cta_subtitle",
                    ] as const
                  ).map((key) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/_/g, " ")}
                      </label>
                      {key.includes("subtitle") ? (
                        <Textarea
                          value={(homeContent as any)[key] ?? ""}
                          onChange={(e) =>
                            setHomeContent({
                              ...homeContent,
                              [key]: e.target.value,
                            })
                          }
                          rows={2}
                          className="bg-background/50 border-white/10"
                        />
                      ) : (
                        <Input
                          value={(homeContent as any)[key] ?? ""}
                          onChange={(e) =>
                            setHomeContent({
                              ...homeContent,
                              [key]: e.target.value,
                            })
                          }
                          className="bg-background/50 border-white/10"
                        />
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(
                      [
                        "stats_projects",
                        "stats_clients",
                        "stats_rating",
                        "stats_years",
                      ] as const
                    ).map((key) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium capitalize">
                          {key.replace("stats_", "")}
                        </label>
                        <Input
                          value={(homeContent as any)[key] ?? ""}
                          onChange={(e) =>
                            setHomeContent({
                              ...homeContent,
                              [key]: e.target.value,
                            })
                          }
                          className="bg-background/50 border-white/10"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => save("home", homeContent)}
                    disabled={isSaving}
                    className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {isSaving ? (
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? "Saving…" : "Save Home Content"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Portfolio ── */}
          {activeTab === "portfolio" && portfolioContent && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                        <Image className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          Portfolio ({portfolioContent.items.length}/
                          {MAX_PORTFOLIO_ITEMS})
                        </CardTitle>
                        <CardDescription>Manage your projects</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {portfolioContent.items.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete all portfolio items?")) {
                              setPortfolioContent({
                                ...portfolioContent,
                                items: [],
                              });
                              setHasChanges(true);
                            }
                          }}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {portfolioContent.items.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                      <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        No portfolio items yet
                      </p>
                      <Button
                        variant="outline"
                        onClick={addPortfolioItem}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add First Item
                      </Button>
                    </div>
                  ) : (
                    portfolioContent.items.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <Card className="bg-background/30 border-white/5">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Item #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: moveUp(
                                        portfolioContent.items,
                                        idx,
                                      ),
                                    })
                                  }
                                  disabled={idx === 0}
                                  className="h-8 w-8"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: moveDown(
                                        portfolioContent.items,
                                        idx,
                                      ),
                                    })
                                  }
                                  disabled={
                                    idx === portfolioContent.items.length - 1
                                  }
                                  className="h-8 w-8"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={item.is_published !== false}
                                  onCheckedChange={(v) => {
                                    const a = [...portfolioContent.items];
                                    a[idx].is_published = v;
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                />
                              </div>
                            </div>
                            {(item.image || previewImages[item.id]) && (
                              <div className="relative group">
                                <img
                                  src={previewImages[item.id] || item.image}
                                  alt={item.title}
                                  className="w-full h-48 object-cover rounded-lg border border-white/10"
                                />
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-8 w-8"
                                  onClick={() => {
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: portfolioContent.items.map((i) =>
                                        i.id === item.id
                                          ? { ...i, image: "" }
                                          : i,
                                      ),
                                    });
                                    setHasChanges(true);
                                    setPreviewImages((p) => {
                                      const n = { ...p };
                                      delete n[item.id];
                                      return n;
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            <label className="block">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    handlePreviewImage(f, item.id);
                                    handleImageUpload(item.id, f);
                                  }
                                }}
                                className="hidden"
                              />
                              <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
                                {uploadingImages[item.id] ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-sm text-primary">
                                      Uploading…
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5 text-primary" />
                                    <span className="text-sm font-medium text-primary">
                                      Click to Upload
                                    </span>
                                  </>
                                )}
                              </div>
                            </label>
                            <Input
                              value={item.image}
                              onChange={(e) => {
                                const a = [...portfolioContent.items];
                                a[idx].image = e.target.value;
                                setPortfolioContent({
                                  ...portfolioContent,
                                  items: a,
                                });
                                setHasChanges(true);
                              }}
                              placeholder="https://example.com/image.png"
                              className="bg-background/50 border-white/10"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Title
                                </label>
                                <Input
                                  value={item.title}
                                  onChange={(e) => {
                                    const a = [...portfolioContent.items];
                                    a[idx].title = e.target.value;
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                  className="bg-background/50 border-white/10"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Category
                                </label>
                                <Input
                                  value={item.category}
                                  onChange={(e) => {
                                    const a = [...portfolioContent.items];
                                    a[idx].category = e.target.value;
                                    setPortfolioContent({
                                      ...portfolioContent,
                                      items: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                  className="bg-background/50 border-white/10"
                                />
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPortfolioContent({
                                  ...portfolioContent,
                                  items: portfolioContent.items.filter(
                                    (_, i) => i !== idx,
                                  ),
                                });
                                setHasChanges(true);
                              }}
                              className="gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Remove
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                  {portfolioContent.items.length < MAX_PORTFOLIO_ITEMS && (
                    <Button
                      variant="outline"
                      onClick={addPortfolioItem}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Item
                    </Button>
                  )}
                  {(portfolioContent.items.length > 0 || hasChanges) && (
                    <Button
                      onClick={() =>
                        save("portfolio", {
                          items: portfolioContent.items
                            .slice(0, MAX_PORTFOLIO_ITEMS)
                            .map((i) => ({ ...i, id: String(i.id) })),
                        })
                      }
                      disabled={isSaving}
                      className={`gap-2 ${hasChanges ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-muted"}`}
                    >
                      {isSaving ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving
                        ? "Saving…"
                        : hasChanges
                          ? "Save Changes"
                          : "Saved"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Pricing ── */}
          {activeTab === "pricing" && pricingContent && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          Pricing Plans ({pricingContent.plans.length})
                        </CardTitle>
                        <CardDescription>Manage pricing plans</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={addPricingPlan}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Plan
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pricingContent.plans.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                      <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        No pricing plans yet
                      </p>
                      <Button
                        variant="outline"
                        onClick={addPricingPlan}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add First Plan
                      </Button>
                    </div>
                  ) : (
                    pricingContent.plans.map((plan, idx) => {
                      const IconComp =
                        PRICING_ICONS.find((i) => i.value === plan.icon)
                          ?.icon ?? Zap;
                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <Card className="bg-background/30 border-white/5">
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium flex items-center gap-2">
                                  <Tag className="w-4 h-4 text-primary" />
                                  {plan.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      setPricingContent({
                                        ...pricingContent,
                                        plans: moveUp(
                                          pricingContent.plans,
                                          idx,
                                        ),
                                      })
                                    }
                                    disabled={idx === 0}
                                    className="h-8 w-8"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      setPricingContent({
                                        ...pricingContent,
                                        plans: moveDown(
                                          pricingContent.plans,
                                          idx,
                                        ),
                                      })
                                    }
                                    disabled={
                                      idx === pricingContent.plans.length - 1
                                    }
                                    className="h-8 w-8"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                  <Switch
                                    checked={plan.is_published !== false}
                                    onCheckedChange={(v) => {
                                      const a = [...pricingContent.plans];
                                      a[idx].is_published = v;
                                      setPricingContent({
                                        ...pricingContent,
                                        plans: a,
                                      });
                                      setHasChanges(true);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {(
                                  ["name", "price_usd", "price_robux"] as const
                                ).map((k) => (
                                  <div key={k} className="space-y-2">
                                    <label className="text-sm font-medium capitalize">
                                      {k.replace(/_/g, " ")}
                                    </label>
                                    <Input
                                      value={(plan as any)[k] ?? ""}
                                      onChange={(e) => {
                                        const a = [...pricingContent.plans];
                                        (a[idx] as any)[k] = e.target.value;
                                        setPricingContent({
                                          ...pricingContent,
                                          plans: a,
                                        });
                                        setHasChanges(true);
                                      }}
                                      className="bg-background/50 border-white/10"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Frames Description
                                </label>
                                <Input
                                  value={plan.frames}
                                  onChange={(e) => {
                                    const a = [...pricingContent.plans];
                                    a[idx].frames = e.target.value;
                                    setPricingContent({
                                      ...pricingContent,
                                      plans: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                  className="bg-background/50 border-white/10"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Features (comma separated)
                                </label>
                                <Input
                                  value={plan.features?.join(", ") ?? ""}
                                  onChange={(e) => {
                                    const a = [...pricingContent.plans];
                                    a[idx].features = e.target.value
                                      .split(",")
                                      .map((f) => f.trim());
                                    setPricingContent({
                                      ...pricingContent,
                                      plans: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                  className="bg-background/50 border-white/10"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {PRICING_ICONS.map(
                                  ({ value, label, icon: Ic }) => (
                                    <Button
                                      key={value}
                                      variant={
                                        plan.icon === value
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() => {
                                        const a = [...pricingContent.plans];
                                        a[idx].icon = value;
                                        setPricingContent({
                                          ...pricingContent,
                                          plans: a,
                                        });
                                        setHasChanges(true);
                                      }}
                                      className="gap-2"
                                    >
                                      <Ic className="w-4 h-4" />
                                      {label}
                                    </Button>
                                  ),
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={plan.featured ?? false}
                                  onCheckedChange={(v) => {
                                    const a = pricingContent.plans.map(
                                      (p, i) => ({
                                        ...p,
                                        featured: i === idx ? v : false,
                                      }),
                                    );
                                    setPricingContent({
                                      ...pricingContent,
                                      plans: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                />
                                <span className="text-sm flex items-center gap-2">
                                  <Star className="w-4 h-4 text-yellow-500" />{" "}
                                  Featured Plan
                                </span>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setPricingContent({
                                    ...pricingContent,
                                    plans: pricingContent.plans.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  });
                                  setHasChanges(true);
                                }}
                                className="gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Remove Plan
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                  {pricingContent.plans.length > 0 && (
                    <Button
                      onClick={() => save("pricing", pricingContent)}
                      disabled={isSaving}
                      className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isSaving ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving…" : "Save Pricing"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Policies ── */}
          {activeTab === "policies" && policiesContent && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          Policies ({policiesContent.policies.length})
                        </CardTitle>
                        <CardDescription>
                          Manage terms & policies
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const p: Policy = {
                          id: crypto.randomUUID(),
                          title: "New Policy",
                          description: "Enter description…",
                          icon: "shield",
                          display_order: policiesContent.policies.length,
                          is_published: true,
                        };
                        setPoliciesContent({
                          ...policiesContent,
                          policies: [...policiesContent.policies, p],
                        });
                        setHasChanges(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Policy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {policiesContent.policies.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        No policies yet
                      </p>
                    </div>
                  ) : (
                    policiesContent.policies.map((policy, idx) => (
                      <motion.div
                        key={policy.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <Card className="bg-background/30 border-white/5">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Policy #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setPoliciesContent({
                                      ...policiesContent,
                                      policies: moveUp(
                                        policiesContent.policies,
                                        idx,
                                      ),
                                    })
                                  }
                                  disabled={idx === 0}
                                  className="h-8 w-8"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setPoliciesContent({
                                      ...policiesContent,
                                      policies: moveDown(
                                        policiesContent.policies,
                                        idx,
                                      ),
                                    })
                                  }
                                  disabled={
                                    idx === policiesContent.policies.length - 1
                                  }
                                  className="h-8 w-8"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={policy.is_published !== false}
                                  onCheckedChange={(v) => {
                                    const a = [...policiesContent.policies];
                                    a[idx].is_published = v;
                                    setPoliciesContent({
                                      ...policiesContent,
                                      policies: a,
                                    });
                                    setHasChanges(true);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Title
                              </label>
                              <Input
                                value={policy.title}
                                onChange={(e) => {
                                  const a = [...policiesContent.policies];
                                  a[idx].title = e.target.value;
                                  setPoliciesContent({
                                    ...policiesContent,
                                    policies: a,
                                  });
                                  setHasChanges(true);
                                }}
                                className="bg-background/50 border-white/10"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Description
                              </label>
                              <Textarea
                                value={policy.description}
                                onChange={(e) => {
                                  const a = [...policiesContent.policies];
                                  a[idx].description = e.target.value;
                                  setPoliciesContent({
                                    ...policiesContent,
                                    policies: a,
                                  });
                                  setHasChanges(true);
                                }}
                                rows={3}
                                className="bg-background/50 border-white/10"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Icon
                              </label>
                              <Input
                                value={policy.icon}
                                onChange={(e) => {
                                  const a = [...policiesContent.policies];
                                  a[idx].icon = e.target.value;
                                  setPoliciesContent({
                                    ...policiesContent,
                                    policies: a,
                                  });
                                  setHasChanges(true);
                                }}
                                placeholder="shield, refresh, clock, lock, code"
                                className="bg-background/50 border-white/10"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPoliciesContent({
                                  ...policiesContent,
                                  policies: policiesContent.policies.filter(
                                    (_, i) => i !== idx,
                                  ),
                                });
                                setHasChanges(true);
                              }}
                              className="gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Remove
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                  {policiesContent.policies.length > 0 && (
                    <Button
                      onClick={() => save("policies", policiesContent)}
                      disabled={isSaving}
                      className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {isSaving ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving…" : "Save Policies"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
