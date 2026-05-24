// src/components/ReviewsMarquee.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  LIVE DATA
//    • Hardcoded `reviewsData` import from data.ts is eliminated.
//    • Reviews are fetched via `getAllReviews()` (Supabase → cache → defaults)
//      so newly approved user submissions appear immediately.
//    • A `contentUpdated` window event re-syncs the list without a reload.
//
//  CSS KEYFRAME ANIMATION (Framer Motion loop removed)
//    • The previous `motion.div animate={{ x: "-25%" }}` approach runs inside
//      React's JS animation loop and cannot be paused by external CSS rules.
//    • This version uses embedded `@keyframes marquee-left` driven by the
//      browser compositor. The CSS rule `.is-scrolling .marquee-track` (from
//      globals.css / DualMarqueeSection's convention) automatically pauses any
//      matching CSS animation — no JS involvement needed.
//    • `animationPlayState` is also controlled directly via React state for
//      the IntersectionObserver-based viewport pause, giving two independent,
//      non-conflicting pause mechanisms.
//
//  DOM CLEANUP (4× → 2× duplication)
//    • The original code duplicated the array 4× to produce a −25% offset
//      loop, leaking up to 32 redundant DOM nodes.
//    • The standard approach is 2× duplication with a −50% keyframe. At the
//      midpoint the track contains exactly one full copy of the data, so
//      visually the loop is seamless. DOM node count is halved.
//
//  INTERSECTIONOBSERVER — viewport freeze
//    • Animations are paused whenever the section is fully outside the
//      viewport. Zero compositor work happens off-screen.
//
//  ECO MODE
//    • When `ecoMode` is active (yd_eco_mode = "true" in localStorage),
//      the marquee is replaced with a static grid of review cards.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { getAllReviews, type Review } from "@/lib/contentManager.ts";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";
import { useLanguage } from "@/hooks/use-language";

// ─── Embedded keyframes ───────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes reviews-marquee-left {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
`;

// ─── Edge fade mask ───────────────────────────────────────────────────────────

const EDGE_MASK =
  "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)";

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  const initial = review.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[340px] bg-white/80 dark:bg-card/70 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-5 hover:border-primary/30 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
            {review.avatar && review.avatar.length === 1 ? (
              <span className="text-primary font-bold text-sm select-none">
                {review.avatar}
              </span>
            ) : (
              <span className="text-primary font-bold text-sm select-none">
                {initial}
              </span>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground truncate max-w-[140px]">
              {review.name}
            </h4>
            <p className="text-xs text-muted-foreground">{review.project_type}</p>
          </div>
        </div>
        {review.verified && (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 mb-2.5" aria-label={`Rating: ${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < review.rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-3">
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Date */}
      <p className="mt-2.5 text-[10px] text-muted-foreground">{review.date}</p>
    </div>
  );
}

// ─── Eco-mode static grid ─────────────────────────────────────────────────────

function EcoReviewGrid({ reviews }: { reviews: Review[] }) {
  const slice = reviews.slice(0, 6);
  if (!slice.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {slice.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewsMarquee() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [ecoMode, setEcoMode] = useState(false);
  // true once the client has mounted — prevents animation flash during SSR hydration
  const [ready, setReady]     = useState(false);
  const [inView, setInView]   = useState(true);

  // ── SSR-safe mount ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true");
    } catch { /* private browsing */ }

    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Eco-mode sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  // ── Fetch live reviews ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getAllReviews()
      .then((data) => {
        if (!alive) return;
        const approved = (Array.isArray(data) ? data : []).filter(
          (r) => r.status === "approved",
        );
        setReviews(approved);
      })
      .catch(() => { if (alive) setReviews([]); });
    return () => { alive = false; };
  }, []);

  // ── Live content updates ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (raw: Event) => {
      const { detail } = raw as CustomEvent<{ type: string; data?: { reviews?: Review[] } }>;
      if (detail?.type !== "reviews") return;
      const updated = (detail.data?.reviews ?? []).filter(
        (r) => r.status === "approved",
      );
      setReviews(updated);
    };
    window.addEventListener("contentUpdated", handler);
    return () => window.removeEventListener("contentUpdated", handler);
  }, []);

  // ── IntersectionObserver: pause animations off-screen ────────────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Minimal duplication: 2× only ─────────────────────────────────────────
  // Keyframe travels 0 → −50%. Two copies fill the track; at the halfway
  // point the visual start repeats exactly. No extra DOM nodes.
  const duplicated: Review[] = reviews.length > 0
    ? [...reviews, ...reviews]
    : [];

  const running = ready && inView && !ecoMode && duplicated.length > 0;

  const trackStyle: CSSProperties = {
    animation: `reviews-marquee-left 30s linear infinite`,
    animationPlayState: running ? "running" : "paused",
    willChange: "transform",
    transform: "translate3d(0, 0, 0)",
  };

  // ─── ECO MODE ─────────────────────────────────────────────────────────────

  if (ecoMode) {
    return (
      <section className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t("reviews.title")}
          </h2>
          <div className="w-20 h-1.5 bg-primary rounded-full mx-auto" />
        </div>
        <EcoReviewGrid reviews={reviews} />
      </section>
    );
  }

  // ─── ANIMATED MARQUEE ─────────────────────────────────────────────────────

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-7xl mx-auto px-6 mb-24 relative z-10 overflow-hidden"
    >
      {/* Self-contained keyframes */}
      <style>{KEYFRAMES}</style>

      {/* Section heading */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
          {t("reviews.title")}
        </h2>
        <div className="w-20 h-1.5 bg-primary rounded-full mx-auto" />
      </div>

      {/* Marquee container */}
      <div
        className="relative overflow-hidden"
        style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
      >
        {/* Marquee track — 2× data for seamless −50% loop */}
        <div
          // The `marquee-track` class lets any global `.is-scrolling .marquee-track`
          // CSS rule pause this animation alongside DualMarqueeSection rows.
          className="flex gap-5 sm:gap-6 w-max marquee-track"
          style={trackStyle}
        >
          {duplicated.map((review, index) => (
            <ReviewCard key={`${review.id}-${index}`} review={review} />
          ))}
        </div>
      </div>

      {/* Empty state shown inline (marquee renders nothing if list is empty) */}
      {!reviews.length && ready && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {t("reviews.noReviewsYet")}
        </div>
      )}
    </section>
  );
}
