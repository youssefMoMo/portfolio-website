// src/components/ReviewSubmissionForm.tsx
//
// ─── REFACTOR NOTES ────────────────────────────────────────────────────────────
//
//  DATA INTEGRITY
//    • All writes are routed through `submitReviewToTable` in contentManager.ts.
//      Direct `supabase.from("reviews").insert` is completely removed. The
//      unified function enforces `status: "pending"`, sanitisation, and the
//      correct schema shape — submissions are never invisible to the admin panel.
//
//  VALIDATION
//    • Name: 2-character minimum enforced before submit.
//    • Text: 10-character minimum enforced before submit.
//    • Both limits are surfaced via translated toast messages.
//
//  DATE FIX
//    • Old: `new Date().toISOString().split("T")[0].slice(0, 7)` → "YYYY-MM"
//      (incorrect — schema expects a fully qualified date string)
//    • New: `new Date().toISOString().split("T")[0]` → "YYYY-MM-DD"
//      No `.slice()`. The "T")[0] split already gives the full date part.
//
//  MOCK-MODE DEVELOPER TOAST
//    • When `isSupabaseEnabled` is false the form still calls submitReviewToTable
//      (which returns `{ ok: false }` immediately), and an additional warning
//      toast is shown to alert developers operating against the mock client.
//
//  LOCALISATION
//    • All user-visible strings are sourced from `useLanguage().t()`.
//      The `reviews.*` namespace already covers every string needed here.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { isSupabaseEnabled } from "@/lib/supabase";
import { submitReviewToTable } from "@/lib/contentManager.ts";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ReviewSubmissionFormProps = {
  onClose: () => void;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReviewSubmissionForm({ onClose }: ReviewSubmissionFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setText_name] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation ──────────────────────────────────────────────────────────

    if (rating === 0) {
      toast({
        title: t("reviews.ratingRequired"),
        description: t("reviews.selectRating"),
        variant: "destructive",
      });
      return;
    }

    if (name.trim().length < 2) {
      toast({
        title: t("reviews.nameRequired"),
        description: t("reviews.nameMinChars"),
        variant: "destructive",
      });
      return;
    }

    if (text.trim().length < 10) {
      toast({
        title: t("reviews.reviewTooShort"),
        description: t("reviews.reviewMinChars"),
        variant: "destructive",
      });
      return;
    }

    // ── Developer warning — mock Supabase client active ───────────────────
    if (!isSupabaseEnabled) {
      toast({
        title: "Dev: Supabase not configured",
        description:
          "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. " +
          "Review was NOT saved. Configure .env.local and reload.",
        variant: "destructive",
      });
    }

    setSubmitting(true);

    try {
      // ── Route through the unified contentManager function ────────────────
      // submitReviewToTable always sets status: "pending", verified: false,
      // and featured: false. The admin panel is the only path to approval.
      const result = await submitReviewToTable({
        name: name.trim(),
        rating,
        text: text.trim(),
        project_type: "UI Design",
        // YYYY-MM-DD — split("T")[0] gives the full date portion, no slice needed
        date: new Date().toISOString().split("T")[0],
        avatar: name.trim().charAt(0).toUpperCase(),
      });

      if (!result.ok) {
        throw new Error(result.error ?? "Unknown error from submitReviewToTable");
      }

      toast({
        title: t("reviews.submitted"),
        description: t("reviews.thankYou"),
      });

      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("reviews.tryAgain");
      toast({
        title: t("reviews.error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-lg w-full bg-card/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </motion.button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-display mb-2">
            {t("reviews.shareExperience")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("reviews.weLoveFeedback")}
          </p>
        </div>

        {/* Mock-mode banner — only shown when Supabase is not configured */}
        <AnimatePresence>
          {!isSupabaseEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-5 flex items-start gap-2 rounded-xl bg-amber-900/30 border border-amber-500/30 px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/90 leading-relaxed">
                <span className="font-semibold">Developer notice:</span>{" "}
                Supabase is not configured. Submissions will not be saved.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* Star rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("reviews.yourRating")}</Label>
            <div className="flex justify-center gap-2" role="group" aria-label={t("reviews.yourRating")}>
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`${star} ${t("reviews.outOf5")}`}
                  aria-pressed={rating === star}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                        : "fill-muted text-muted"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="review-name" className="text-sm font-medium">
              {t("reviews.yourName")}
            </Label>
            <Input
              id="review-name"
              value={name}
              onChange={(e) => setText_name(e.target.value)}
              placeholder={t("reviews.enterName")}
              className="bg-background/50 border-white/10"
              autoComplete="nickname"
              minLength={2}
            />
          </div>

          {/* Review text */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="review-text" className="text-sm font-medium">
                {t("reviews.yourReview")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {text.length} {t("reviews.characters")}
              </span>
            </div>
            <Textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("reviews.ctaText")}
              className="min-h-[120px] bg-background/50 border-white/10 resize-none"
              minLength={10}
            />
          </div>

          {/* Submit */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {t("reviews.submit")}
                </>
              )}
            </Button>
          </motion.div>

        </form>
      </motion.div>
    </motion.div>
  );
}
