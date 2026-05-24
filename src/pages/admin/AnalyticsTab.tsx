// src/pages/admin/AnalyticsTab.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Star, Users, Gamepad2, Image, FileText,
  RefreshCcw, TrendingUp, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyticsApi, type AnalyticsData } from "@/lib/adminApi";
import { SafeImage } from "@/components/SafeImage";

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="bg-card/60 backdrop-blur-xl border-white/10">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium">{label}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Mini rating stars ──────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "fill-neutral-400 text-neutral-500"}`} />
      ))}
    </span>
  );
}

export default function AnalyticsTab() {
  const { toast }    = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.get();
      setData(res);
    } catch (err: unknown) {
      toast({ title: "❌ Failed to load analytics", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/60 border-white/10">
        <CardContent className="py-16 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Could not load analytics. Make sure the API is configured.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={load}>
            <RefreshCcw className="w-4 h-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div key="analytics" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(data.generated_at).toLocaleString()}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCcw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon={Gamepad2} label="Total games"    value={data.games.total}         sub={`${data.games.active} active`}          color="from-cyan-500 to-blue-600"      delay={0.05} />
        <StatCard icon={Star}     label="Reviews"        value={data.reviews.total}        sub={`${data.reviews.pending} pending`}      color="from-yellow-500 to-orange-500"  delay={0.1} />
        <StatCard icon={TrendingUp} label="Avg rating"   value={`${data.reviews.avg_rating}★`} sub="approved reviews"                  color="from-green-500 to-emerald-600"  delay={0.15} />
        <StatCard icon={Image}    label="Portfolio items" value={data.portfolio.items}      sub="published"                             color="from-purple-500 to-pink-500"    delay={0.2} />
        <StatCard icon={CheckCircle2} label="Approved reviews" value={data.reviews.approved} sub="visible on site"                     color="from-teal-500 to-green-600"     delay={0.25} />
        <StatCard icon={FileText} label="Content sections" value={data.content.sections}   sub={data.content.last_updated ? "last edited " + new Date(data.content.last_updated).toLocaleDateString() : "never edited"} color="from-orange-500 to-red-500" delay={0.3} />
      </div>

      {/* Top games + recent reviews side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top games */}
        <Card className="bg-card/60 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg">Top Games by Visits</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.games.top.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No games yet</p>
            ) : (
              <div className="space-y-3">
                {data.games.top.map((g, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3">
                    <span className="w-6 text-xs text-muted-foreground font-mono">#{i + 1}</span>
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0">
                      {g.icon_url
                        ? <SafeImage src={g.icon_url} alt={g.name} className="w-full h-full object-cover" wrapperClassName="w-full h-full" fallbackIcon={<Gamepad2 className="w-5 h-5 m-2 text-primary/40" />} />
                        : <Gamepad2 className="w-5 h-5 m-2 text-primary/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.visits?.toLocaleString()} visits</p>
                    </div>
                    {/* Simple bar */}
                    <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${Math.min(100, (g.visits / (data.games.top[0]?.visits || 1)) * 100)}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reviews */}
        <Card className="bg-card/60 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
                <Star className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg">Recent Reviews</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.recent_reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {data.recent_reviews.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.project_type}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Stars rating={r.rating} />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.approved ? "bg-green-500/15 text-green-400" : r.rejected ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                          {r.approved ? "Approved" : r.rejected ? "Rejected" : "Pending"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
