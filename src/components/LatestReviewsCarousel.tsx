// src/components/LatestReviewsCarousel.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  LIVE DATA
//    • The hardcoded `reviewsData` static array is completely removed.
//    • Data is fetched from `getAllReviews()` (Supabase → cache → bundled
//      defaults). Only `status === "approved"` reviews are displayed.
//    • A `contentUpdated` event listener refreshes the list in-tab whenever
//      the admin panel approves or edits a review without a page reload.
//
//  RESPONSIVE ITEMS-PER-PAGE
//    • Previously hardcoded to 3 columns on all viewports.
//    • Now driven by a ResizeObserver on the carousel container. The component
//      calculates how many cards actually fit (min 280 px per card + gap) so
//      the layout is never wider than the viewport and the pagination count
//      stays accurate.
//    • Falls back gracefully to 1 card on very narrow screens.
//
//  SMOOTH ANIMATION (AnimatePresence fix)
//    • Old: `key={currentPage}` on the grid caused the entire grid to unmount
//      and remount aggressively, producing a jarring layout jump.
//    • New: the outer AnimatePresence wrapper uses `mode="popLayout"` so that
//      the exit animation completes before the enter begins (no simultaneous
//      resize). A directional `xOffset` state tracks whether the user is
//      paging forward or backward to give the correct sliding direction.
//
//  LOADING & EMPTY STATES
//    • Skeleton cards render while the async fetch is in-flight.
//    • An empty-state message is shown when no approved reviews exist.

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAllReviews, type Review } from "@/lib/contentManager.ts";
import { useLanguage } from "@/hooks/use-language";

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_MIN_WIDTH = 280; // px — minimum card width before wrapping
const CARD_GAP       = 24;  // px — gap-6 = 1.5rem = 24px at 16px base

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 rounded-2xl bg-card/60 border border-white/10 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
      </div>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="w-4 h-4 rounded-full bg-white/10" />
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
      </div>
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="h-full bg-white/60 dark:bg-card/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 shadow-sm dark:shadow-none">
      <CardContent className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar: initial letter or first char */}
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
              {review.avatar && review.avatar.length === 1 ? (
                <span className="text-primary font-bold text-lg select-none">
                  {review.avatar}
                </span>
              ) : (
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-foreground leading-tight">
                  {review.name}
                </h3>
                {review.verified && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{review.project_type}</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 mt-0.5">
            {review.date}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3" aria-label={`Rating: ${review.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-muted text-muted"
              }`}
            />
          ))}
        </div>

        {/* Text */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 flex-1">
          &ldquo;{review.text}&rdquo;
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LatestReviewsCarousel() {
  const { t } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);

  const [reviews, setReviews]         = useState<Review[]>([]);
  const [loading, setLoading]         = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(3);
  // +1 = navigating forward, -1 = navigating backward
  const [direction, setDirection]     = useState<1 | -1>(1);

  // ── Fetch live reviews ────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAllReviews()
      .then((data) => {
        if (!alive) return;
        const approved = (Array.isArray(data) ? data : []).filter(
          (r) => r.status === "approved",
        );
        setReviews(approved);
        setCurrentPage(0);
      })
      .catch(() => { if (alive) setReviews([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // ── Live updates (admin approval without page reload) ────────────────────

  useEffect(() => {
    const handler = (raw: Event) => {
      const { detail } = raw as CustomEvent<{ type: string; data?: { reviews?: Review[] } }>;
      if (detail?.type !== "reviews") return;
      const updated = (detail.data?.reviews ?? []).filter(
        (r) => r.status === "approved",
      );
      setReviews(updated);
      setCurrentPage(0);
    };
    window.addEventListener("contentUpdated", handler);
    return () => window.removeEventListener("contentUpdated", handler);
  }, []);

  // ── Responsive items-per-page via ResizeObserver ─────────────────────────

  const recalcCardsPerPage = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const availableWidth = el.clientWidth;
    // How many cards fit, given their min width and the gaps between them?
    // n cards → (n × CARD_MIN_WIDTH) + ((n-1) × CARD_GAP) ≤ availableWidth
    // → n ≤ (availableWidth + GAP) / (CARD_MIN_WIDTH + GAP)
    const n = Math.max(1, Math.floor((availableWidth + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
    setCardsPerPage((prev) => {
      if (prev === n) return prev;
      setCurrentPage(0); // reset page whenever layout reflows
      return n;
    });
  }, []);

  useEffect(() => {
    recalcCardsPerPage();
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recalcCardsPerPage);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recalcCardsPerPage]);

  // ── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(reviews.length / cardsPerPage));

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentPage ? 1 : -1);
      setCurrentPage(index);
    },
    [currentPage],
  );

  const goPrev = useCallback(() => {
    if (currentPage > 0) goTo(currentPage - 1);
  }, [currentPage, goTo]);

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) goTo(currentPage + 1);
  }, [currentPage, totalPages, goTo]);

  const currentReviews = reviews.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage,
  );

  // ── Animation variants — directional slide ────────────────────────────────

  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 60 : -60,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -60 : 60,
      transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] as const },
    }),
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10">

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
          {t("reviews.title")}
        </h2>
        <motion.div
          className="w-20 h-1.5 bg-primary rounded-full mx-auto"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </motion.div>

      {/* Carousel container — measured for responsive cardsPerPage */}
      <div ref={containerRef} className="relative overflow-hidden">

        {loading ? (
          /* Skeleton state */
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `repeat(${cardsPerPage}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: cardsPerPage }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <Star className="w-12 h-12 opacity-20" />
            <p className="text-lg font-medium">{t("reviews.noReviewsYet")}</p>
            <p className="text-sm">{t("reviews.beFirst")}</p>
          </div>
        ) : (
          /* Paginated grid with directional slide */
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${cardsPerPage}, minmax(0, 1fr))`,
              }}
            >
              {currentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Navigation: prev / dots / next */}
      {!loading && reviews.length > cardsPerPage && (
        <div className="flex items-center justify-center gap-4 mt-8">

          {/* Prev */}
          <motion.button
            onClick={goPrev}
            disabled={currentPage === 0}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, index) => (
              <motion.button
                key={index}
                onClick={() => goTo(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentPage
                    ? "bg-primary w-7"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2.5"
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to page ${index + 1}`}
                aria-current={index === currentPage ? "true" : undefined}
              />
            ))}
          </div>

          {/* Next */}
          <motion.button
            onClick={goNext}
            disabled={currentPage >= totalPages - 1}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>

        </div>
      )}

    </section>
  );
}
