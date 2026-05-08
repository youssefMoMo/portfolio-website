// src/pages/admin/ReviewsTab.tsx — Reviews moderation with approve / reject / delete
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Star, CheckCircle2, XCircle, Trash2,
  RefreshCcw, Filter, ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { reviewsApi, type Review } from "@/lib/adminApi";

type Filter = "all" | "pending" | "approved" | "rejected";

const FILTER_CONFIG: Record<Filter, { label: string; color: string; badge: string }> = {
  all:      { label: "All",      color: "border-white/20 text-white",              badge: "bg-white/10" },
  pending:  { label: "Pending",  color: "border-amber-500/40 text-amber-400",      badge: "bg-amber-500/15" },
  approved: { label: "Approved", color: "border-green-500/40 text-green-400",      badge: "bg-green-500/15" },
  rejected: { label: "Rejected", color: "border-red-500/40 text-red-400",          badge: "bg-red-500/15" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
      ))}
    </span>
  );
}

// ── Single review card ─────────────────────────────────────────
function ReviewCard({ review, onAction }: { review: Review; onAction: () => void }) {
  const { toast }            = useToast();
  const [busy, setBusy]      = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(review.text);

  const act = async (action: "approve" | "reject" | "delete") => {
    if (action === "delete" && !confirm(`Delete review from "${review.name}"?`)) return;
    setBusy(action);
    try {
      await reviewsApi[action](review.id);
      toast({ title: action === "approve" ? "✅ Approved" : action === "reject" ? "🚫 Rejected" : "🗑️ Deleted" });
      onAction();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    setBusy("edit");
    try {
      await reviewsApi.update(review.id, { text: editText });
      toast({ title: "✅ Updated" });
      setEditing(false);
      onAction();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = review.approved
    ? "bg-green-500/15 text-green-400"
    : review.rejected
    ? "bg-red-500/15 text-red-400"
    : "bg-amber-500/15 text-amber-400";

  const statusLabel = review.approved ? "Approved" : review.rejected ? "Rejected" : "Pending";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="bg-background/30 border-white/5">
        <CardContent className="p-5 space-y-3">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {(review.avatar ?? review.name.charAt(0)).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{review.name}</p>
                <p className="text-xs text-muted-foreground">{review.project_type} · {new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Stars rating={review.rating} />
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>{statusLabel}</span>
            </div>
          </div>

          {/* Review text or edit */}
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="bg-background/50 border-white/10 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={busy === "edit"} className="gap-1.5">
                  {busy === "edit" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!review.approved && (
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => act("approve")} disabled={!!busy}
              >
                {busy === "approve" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </Button>
            )}
            {!review.rejected && (
              <Button
                size="sm" variant="outline"
                className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => act("reject")} disabled={!!busy}
              >
                {busy === "reject" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <XCircle className="w-3.5 h-3.5" />}
                Reject
              </Button>
            )}
            <Button
              size="sm" variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(!editing)}
            >
              Edit
            </Button>
            <Button
              size="sm" variant="ghost"
              className="gap-1.5 text-red-400 hover:text-red-500 ml-auto"
              onClick={() => act("delete")} disabled={!!busy}
            >
              {busy === "delete" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main tab ───────────────────────────────────────────────────
export default function ReviewsTab() {
  const { toast }          = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter]   = useState<Filter>("all");
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.list(filter, page);
      setReviews(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "❌ Failed to load reviews", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = (f: Filter) => { setFilter(f); setPage(1); };

  const counts = {
    all:      reviews.length,
    pending:  reviews.filter((r) => !r.approved && !r.rejected).length,
    approved: reviews.filter((r) => r.approved).length,
    rejected: reviews.filter((r) => r.rejected).length,
  };

  return (
    <motion.div key="reviews" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Reviews ({reviews.length})</CardTitle>
                <CardDescription>Moderate customer feedback</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => {
              const cfg = FILTER_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => changeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? cfg.color + " " + cfg.badge : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                >
                  {cfg.label} ({counts[f]})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} reviews found</p>
            </div>
          ) : (
            <AnimatePresence>
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} onAction={load} />
              ))}
            </AnimatePresence>
          )}

          {/* Pagination */}
          {reviews.length >= 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={reviews.length < 20} onClick={() => setPage((p) => p + 1)} className="gap-1.5">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
