import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageCircle, MessageSquare, Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getAllReviews, submitReviewToTable, ReviewsContent, Review } from "@/lib/contentManager";
import { profile } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";

// ══════════════════════════════════════════
// Write Review Popup
// ══════════════════════════════════════════
function WriteReviewModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (r: Omit<Review, "id" | "verified" | "avatar">) => void;
}) {
  const [name, setName] = useState("");

  // Lock body scroll + ESC to close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");

  // Detect Arabic text
  const hasArabic = (str: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);

  // Basic profanity filter
  const BLOCKED_WORDS = ["fuck","shit","ass","bitch","dick","pussy","damn","bastard","crap","hell","cock","nigger","nigga","whore","slut","piss","cunt"];
  const hasProfanity = (str: string) => {
    const lower = str.toLowerCase();
    return BLOCKED_WORDS.some(w => new RegExp(`\\b${w}\\b`, "i").test(lower));
  };

  const validateText = (value: string) => {
    setText(value);
    if (hasArabic(value)) {
      setValidationMsg("⚠️ Arabic text is not allowed in reviews. Please write in English or Spanish only.");
    } else if (hasProfanity(value)) {
      setValidationMsg("⚠️ Please keep your review respectful. No profanity allowed.");
    } else {
      setValidationMsg("");
    }
  };

  const validateName = (value: string) => {
    setName(value);
    if (hasArabic(value)) {
      setValidationMsg("⚠️ Arabic text is not allowed. Please use English or Spanish.");
    } else {
      setValidationMsg("");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !text.trim()) return;
    if (hasArabic(name) || hasArabic(text)) {
      setValidationMsg("⚠️ Arabic text is not allowed in reviews. Please write in English or Spanish only.");
      return;
    }
    if (hasProfanity(text) || hasProfanity(name)) {
      setValidationMsg("⚠️ Please keep your review respectful. No profanity allowed.");
      return;
    }
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      rating,
      text: text.trim(),
      project_type: "UI Design",
      date: new Date().toISOString().split("T")[0],
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-sm bg-[#111318] border border-white/10 rounded-2xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Write a Review</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-white/70 mb-1.5">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => validateName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2.5 bg-[#1a1d27] border border-white/8 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Rating Stars */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-white/70 mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    i <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-white/10 text-white/20"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-white/70 mb-1.5">Your Feedback</label>
          <textarea
            value={text}
            onChange={e => validateText(e.target.value)}
            placeholder="How was your experience?"
            rows={4}
            className="w-full px-3 py-2.5 bg-[#1a1d27] border border-white/8 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 transition-colors resize-none"
          />
          {validationMsg && (
            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {validationMsg}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !text.trim() || !!validationMsg}
          className="w-full py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════
// Main Reviews Page
// ══════════════════════════════════════════
export default function Reviews() {
  const { t } = useLanguage();
  const [content, setContent] = useState<ReviewsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const allRevs = await getAllReviews();
        if (mountedRef.current) setContent({ reviews: Array.isArray(allRevs) ? allRevs : [] });
      } catch {
        if (mountedRef.current) setContent({ reviews: [] });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, []);

  // Dynamic stats — recalculates whenever reviews change (including new submissions)
  const stats = useMemo(() => {
    if (!content?.reviews?.length) return { avg: 0, total: 0, fiveStarPct: 0 };
    const total = content.reviews.length;
    const avg = content.reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    const fiveStar = content.reviews.filter(r => r.rating === 5).length;
    return {
      avg: Math.round(avg * 10) / 10,
      total,
      fiveStarPct: Math.round((fiveStar / total) * 100),
    };
  }, [content]);

  const handleSubmitReview = useCallback(async (reviewData: Omit<Review, "id" | "verified" | "avatar">) => {
    const newReview: Review = {
      id: crypto.randomUUID(),
      ...reviewData,
      verified: true,
      avatar: reviewData.name.charAt(0).toUpperCase(),
    };
    // 1. Optimistically update UI immediately
    const currentReviews = content?.reviews ?? [];
    setContent({ reviews: [...currentReviews, newReview] });

    // 2. Save to Supabase dedicated `reviews` table (public INSERT allowed)
    await submitReviewToTable(newReview);

    // 3. Refresh from Supabase to get the saved version
    const t1 = setTimeout(async () => {
      try {
        const allRevs = await getAllReviews();
        if (mountedRef.current) setContent({ reviews: Array.isArray(allRevs) ? allRevs : [] });
      } catch {}
    }, 1000);
    timersRef.current.push(t1);

    if (mountedRef.current) setSubmitSuccess(true);
    const t2 = setTimeout(() => {
      if (mountedRef.current) setSubmitSuccess(false);
    }, 4000);
    timersRef.current.push(t2);
  }, [content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const reviews = content?.reviews?.filter(r => r.verified) || [];

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <WriteReviewModal
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmitReview}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <MessageCircle className="w-4 h-4" />
            {t("reviews.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold font-display mb-4 sm:mb-6 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent"
          >
            {t("reviews.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t("reviews.subtitle")}
          </motion.p>
        </div>

        {/* Rating Summary — live calculated */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto mb-12 sm:mb-16 p-6 sm:p-8 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/5 text-center"
          >
            <p className="text-5xl sm:text-6xl font-bold font-display bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
              {stats.avg}
            </p>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < Math.round(stats.avg) ? {
                    filter: ["drop-shadow(0 0 0px #facc15)", "drop-shadow(0 0 8px #facc15)", "drop-shadow(0 0 0px #facc15)"],
                  } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                >
                  <Star
                    className={`w-6 h-6 ${i < Math.round(stats.avg) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                  />
                </motion.div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("reviews.based")} <strong>{stats.total}</strong>{" "}
              {t("reviews.reviewsText")} • {stats.fiveStarPct}% ★★★★★
            </p>
          </motion.div>
        )}

        {/* Success Banner */}
        <AnimatePresence>
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-green-500/15 border border-green-500/25 text-center text-green-400 text-sm font-medium"
            >
              ✅ Your review was submitted successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews Grid */}
        {reviews.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No reviews yet — be the first!</p>
            <Button
              onClick={() => setShowModal(true)}
              className="gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-6 font-semibold discord-glow"
            >
              <Star className="w-4 h-4" /> Write a Review
            </Button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="break-inside-avoid group relative rounded-2xl bg-card/40 backdrop-blur-xl border border-white/5 hover:border-primary/20 p-5 sm:p-6 transition-all duration-300"
              >
                <Quote className="w-7 h-7 text-primary/20 mb-3" />
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-4">
                  "{review.text}"
                </p>
                {/* Stars with glow */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <motion.div
                      key={si}
                      animate={si < review.rating ? {
                        filter: ["drop-shadow(0 0 0px #facc15)", "drop-shadow(0 0 6px #facc15)", "drop-shadow(0 0 0px #facc15)"],
                      } : {}}
                      transition={{ duration: 3, repeat: Infinity, delay: si * 0.2 + i * 0.1 }}
                    >
                      <Star
                        className={`w-5 h-5 ${si < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`}
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    {review.avatar || review.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{review.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {review.project_type} • {review.date}
                    </p>
                  </div>
                  {review.verified && (
                    <span className="ml-auto shrink-0 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 sm:mt-24 bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
            {t("reviews.ctaTitle")}
          </h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
            {t("reviews.ctaText")}
          </p>
          <Button
            size="lg"
            className="gap-2 rounded-full px-6 sm:px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
            onClick={() => setShowModal(true)}
          >
            <Star className="w-4 h-4" />
            {t("reviews.writeReview")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
