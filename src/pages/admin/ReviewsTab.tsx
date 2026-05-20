// src/pages/admin/ReviewsTab.tsx — Full admin CRUD for reviews
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Star, CheckCircle2, XCircle, Trash2,
  RefreshCcw, ChevronLeft, ChevronRight, Plus, Pin, Edit3, X,
  User, Calendar, Layers, Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { reviewsApi, type Review } from "@/lib/adminApi";

type FilterKey = "all" | "pending" | "approved" | "rejected";

const FILTER_CONFIG: Record<FilterKey, { label: string; color: string; badge: string }> = {
  all:      { label: "All",      color: "border-white/20 text-white",         badge: "bg-white/10" },
  pending:  { label: "Pending",  color: "border-amber-500/40 text-amber-400", badge: "bg-amber-500/15" },
  approved: { label: "Approved", color: "border-green-500/40 text-green-400", badge: "bg-green-500/15" },
  rejected: { label: "Rejected", color: "border-red-500/40 text-red-400",     badge: "bg-red-500/15" },
};

// ── Star rating input ──────────────────────────────────────────
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "fill-white/10 text-white/20"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Create / Edit form ─────────────────────────────────────────
interface ReviewFormData {
  name: string;
  rating: number;
  text: string;
  project_type: string;
  avatar: string;
  date: string;
  approved: boolean;
  featured: boolean;
  verified: boolean;
}

const EMPTY_FORM: ReviewFormData = {
  name: "",
  rating: 5,
  text: "",
  project_type: "UI Design",
  avatar: "",
  date: new Date().toISOString().split("T")[0],
  approved: true,
  featured: false,
  verified: true,
};

function ReviewFormPanel({
  initial,
  onSave,
  onCancel,
  mode,
}: {
  initial?: Partial<ReviewFormData>;
  onSave: (data: ReviewFormData) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
}) {
  const [form, setForm] = useState<ReviewFormData>({ ...EMPTY_FORM, ...initial });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof ReviewFormData, v: ReviewFormData[keyof ReviewFormData]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) return;
    setBusy(true);
    try {
      await onSave(form);
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {icon} {label}
      </label>
      {children}
    </div>
  );

  const inputCls = "bg-white dark:bg-background/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-foreground text-sm focus:border-primary/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-primary/20 rounded-xl bg-primary/5 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {mode === "create" ? <Plus className="w-4 h-4 text-primary" /> : <Edit3 className="w-4 h-4 text-primary" />}
          {mode === "create" ? "Create New Review" : "Edit Review"}
        </h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("Client Name *", <User className="w-3.5 h-3.5" />,
          <Input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. John Doe" />
        )}
        {field("Username / Avatar (initial)", <ImageIcon className="w-3.5 h-3.5" />,
          <Input className={inputCls} value={form.avatar} onChange={(e) => set("avatar", e.target.value)} placeholder="Optional initial or emoji" />
        )}
        {field("Project Type", <Layers className="w-3.5 h-3.5" />,
          <Input className={inputCls} value={form.project_type} onChange={(e) => set("project_type", e.target.value)} placeholder="UI Design, Game UI…" />
        )}
        {field("Date", <Calendar className="w-3.5 h-3.5" />,
          <Input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} />
        )}
      </div>

      {field("Rating", <Star className="w-3.5 h-3.5" />,
        <StarInput value={form.rating} onChange={(v) => set("rating", v)} />
      )}

      {field("Review Text *", <MessageSquare className="w-3.5 h-3.5" />,
        <Textarea
          className={inputCls}
          rows={4}
          value={form.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder="Client's review text…"
        />
      )}

      {/* Toggles */}
      <div className="flex flex-wrap gap-3 pt-1">
        {(["approved", "featured", "verified"] as const).map((key) => {
          const labels: Record<string, string> = {
            approved: "Auto-Approve (public)",
            featured: "Pin / Feature",
            verified: "Verified Client",
          };
          return (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative ${form[key] ? "bg-primary" : "bg-white/10"}`}
                style={{ height: "18px" }}
                onClick={() => set(key, !form[key])}
              >
                <div
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${form[key] ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              <span className="text-xs text-muted-foreground">{labels[key]}</span>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={busy || !form.name.trim() || !form.text.trim()}
          className="gap-1.5"
        >
          {busy && <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />}
          {mode === "create" ? "Create Review" : "Save Changes"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </motion.div>
  );
}

// ── Stars display ──────────────────────────────────────────────
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
  const { toast }             = useToast();
  const [busy, setBusy]       = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  const handlePin = async () => {
    setBusy("pin");
    try {
      await reviewsApi.pin(review.id, !review.featured);
      toast({ title: review.featured ? "📌 Unpinned" : "📌 Pinned to top" });
      onAction();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleEditSave = async (data: ReviewFormData) => {
    setBusy("edit");
    try {
      await reviewsApi.update(review.id, {
        name: data.name,
        text: data.text,
        rating: data.rating,
        project_type: data.project_type,
      });
      toast({ title: "✅ Updated" });
      setEditing(false);
      onAction();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // Resolve status from canonical column first, fall back to legacy booleans
  const resolvedStatus: "approved" | "rejected" | "pending" =
    review.status === "approved" || review.approved
      ? "approved"
      : review.status === "rejected" || review.rejected
      ? "rejected"
      : "pending";
  const statusBadge =
    resolvedStatus === "approved"
      ? "bg-green-500/15 text-green-400"
      : resolvedStatus === "rejected"
      ? "bg-red-500/15 text-red-400"
      : "bg-amber-500/15 text-amber-400";
  const statusLabel =
    resolvedStatus === "approved" ? "Approved" : resolvedStatus === "rejected" ? "Rejected" : "Pending";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className={`bg-white/60 dark:bg-background/30 border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none ${review.featured ? "border-primary/30 ring-1 ring-primary/10" : ""}`}>
        <CardContent className="p-5 space-y-3">
          {review.featured && (
            <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
              <Pin className="w-3 h-3" /> Featured / Pinned
            </div>
          )}

          {editing ? (
            <ReviewFormPanel
              mode="edit"
              initial={{ name: review.name, text: review.text, rating: review.rating, project_type: review.project_type }}
              onSave={handleEditSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              {/* Header */}
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

              <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {resolvedStatus !== "approved" && (
                  <Button size="sm" variant="outline"
                    className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => act("approve")} disabled={!!busy}
                  >
                    {busy === "approve" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve
                  </Button>
                )}
                {resolvedStatus !== "rejected" && (
                  <Button size="sm" variant="outline"
                    className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => act("reject")} disabled={!!busy}
                  >
                    {busy === "reject" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <XCircle className="w-3.5 h-3.5" />}
                    Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(true)}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost"
                  className={`gap-1.5 ${review.featured ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  onClick={handlePin} disabled={!!busy}
                >
                  <Pin className="w-3.5 h-3.5" /> {review.featured ? "Unpin" : "Pin"}
                </Button>
                <Button size="sm" variant="ghost"
                  className="gap-1.5 text-red-400 hover:text-red-500 ml-auto"
                  onClick={() => act("delete")} disabled={!!busy}
                >
                  {busy === "delete" ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


// ── Main tab ───────────────────────────────────────────────────
export default function ReviewsTab() {
  const { toast }               = useToast();
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [filter, setFilter]     = useState<FilterKey>("all");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

  const changeFilter = (f: FilterKey) => { setFilter(f); setPage(1); };

  const handleCreate = async (data: ReviewFormData) => {
    try {
      await reviewsApi.create(data);
      toast({ title: "✅ Review created", description: data.approved ? "Live on public site" : "Saved as pending" });
      setShowCreate(false);
      load();
    } catch (e: any) {
      toast({ title: "❌ Failed to create", description: e.message, variant: "destructive" });
    }
  };

  const counts = {
    all:      reviews.length,
    pending:  reviews.filter((r) => (r.status === "pending") || (!r.status && !r.approved && !r.rejected)).length,
    approved: reviews.filter((r) => (r.status === "approved") || r.approved).length,
    rejected: reviews.filter((r) => (r.status === "rejected") || r.rejected).length,
  };

  return (
    <motion.div
      key="reviews"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 dark:bg-card/60 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Reviews ({reviews.length})</CardTitle>
                <CardDescription>Create, moderate and manage customer feedback</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" className="gap-2"
                onClick={() => setShowCreate((v) => !v)}
              >
                <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "New Review"}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
                <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(["all", "pending", "approved", "rejected"] as FilterKey[]).map((f) => {
              const cfg = FILTER_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => changeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filter === f
                      ? `${cfg.color} ${cfg.badge}`
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-muted-foreground hover:border-slate-400 dark:hover:border-white/20 bg-white dark:bg-transparent shadow-sm dark:shadow-none"
                  }`}
                >
                  {cfg.label} ({counts[f]})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Create form */}
          <AnimatePresence>
            {showCreate && (
              <ReviewFormPanel
                mode="create"
                onSave={handleCreate}
                onCancel={() => setShowCreate(false)}
              />
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground mb-4">No {filter !== "all" ? filter : ""} reviews found</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create the first review
              </Button>
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
