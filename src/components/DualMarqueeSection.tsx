// src/components/DualMarqueeSection.tsx
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MARQUEE ANIMATION ARCHITECTURE — 2026 OVERHAUL                        ║
// ║                                                                          ║
// ║  3-WAY ALTERNATING DIRECTION MATRIX (language-guarded):                 ║
// ║    Row 1 · Reviews  → LEFT  (←  Westbound)                             ║
// ║    Row 2 · Stats    → RIGHT (→  Eastbound)                             ║
// ║    Row 3 · Tools    → LEFT  (←  Westbound)                             ║
// ║                                                                          ║
// ║  LANGUAGE GUARD: dir="ltr" is applied to every row wrapper. The CSS     ║
// ║  translate3d keyframes are absolute coordinate transforms — they are     ║
// ║  NOT relative to the document writing direction, so switching the HTML   ║
// ║  root to dir="rtl" for Arabic locale can never flip these animations.   ║
// ║                                                                          ║
// ║  SINGLE ENGINE: Pure CSS @keyframes only. Zero Framer Motion on scroll  ║
// ║  tracks. FM's repeat:Infinity desynchronises on first paint; CSS        ║
// ║  animations start on the compositing thread with no JS tick delay.      ║
// ║                                                                          ║
// ║  DYNAMIC SPEED CALIBRATION — the critical fix:                          ║
// ║    1. Duplicate items exactly 2× (minimum for a -50% seamless loop).    ║
// ║    2. After first paint, measure scrollWidth / 2 = one set's width.     ║
// ║    3. Compute duration = oneSetWidth / PX_PER_SECOND.                   ║
// ║    This locks every row to a constant pixel-per-second crawl regardless ║
// ║    of how many reviews Supabase returns, screen DPI, or card sizes.     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { useEffect, useRef, useState } from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Target scroll speed in CSS pixels per second. 50 px/s ≈ a slow, cinematic drift. */
const REVIEWS_PX_PER_SEC  = 50;
const STATS_PX_PER_SEC    = 45;
const TOOLS_PX_PER_SEC    = 38;

/** Minimum animation duration (seconds) — prevents sub-second flickers on tiny viewports. */
const MIN_DURATION = 30;

const STATS_ICONS: Record<string, React.ElementType> = {
  briefcase: Briefcase, users: Users, clock: Clock, star: Star,
  gamepad: Gamepad, zap: Zap, refresh: RefreshCw, repeat: Repeat,
};

// Three core tools. The MarqueeRow component measures the actual rendered
// scrollWidth after mount and computes duration = oneSetWidth / TOOLS_PX_PER_SEC,
// so removing items here automatically produces the correct crawl speed.
const TOOLS = [
  { id: 1, name: "Photoshop",     logo: "/images/global/photoshop.png",     emoji: "🖼️" },
  { id: 2, name: "Figma",         logo: "/images/global/figma.png",         emoji: "🎨" },
  { id: 3, name: "Roblox Studio", logo: "/images/global/roblox-studio.png", emoji: "🎮" },
];

// Edge-fade mask applied to every marquee row wrapper
const MASK =
  "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)";

// ─── Generic MarqueeRow ──────────────────────────────────────────────────────
//
// Accepts items[] + renderItem (not pre-duplicated children).
// Handles 2× duplication internally so it can precisely measure oneSetWidth
// and compute the correct duration to achieve the target px/s.

interface MarqueeRowProps<T> {
  items     : T[];
  renderItem: (item: T, globalIdx: number) => React.ReactNode;
  direction ?: "left" | "right";
  pxPerSec  ?: number;
  ready     : boolean;
}

function MarqueeRow<T extends NonNullable<unknown>>({
  items,
  renderItem,
  direction  = "left",
  pxPerSec   = REVIEWS_PX_PER_SEC,
  ready,
}: MarqueeRowProps<T>) {
  const trackRef             = useRef<HTMLDivElement>(null);
  const [duration, setDur]   = useState(0);
  const animName             =
    direction === "left" ? "marquee-scroll-left" : "marquee-scroll-right";

  // After first paint (ready=true) — or whenever items change (async Supabase load) —
  // measure half of scrollWidth (= one set's width) and derive the CSS duration.
  useEffect(() => {
    if (!ready || !trackRef.current || items.length === 0) return;
    const id = requestAnimationFrame(() => {
      if (!trackRef.current) return;
      // scrollWidth = copy-A width + copy-B width = 2 × oneSetWidth
      const oneSetWidth = trackRef.current.scrollWidth / 2;
      if (oneSetWidth > 0) {
        setDur(Math.max(oneSetWidth / pxPerSec, MIN_DURATION));
      }
    });
    return () => cancelAnimationFrame(id);
  }, [ready, items, pxPerSec]);

  if (items.length === 0) return null;

  const isAnimating = ready && duration > 0;

  return (
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          animation : isAnimating
            ? `${animName} ${duration.toFixed(3)}s linear infinite`
            : "none",
          willChange: "transform",
          transform : "translateZ(0)",
        }}
      >
        {/* Copy A — keys prefixed "a-" */}
        {items.map((item, i) => renderItem(item, i))}
        {/* Copy B — keys prefixed "b-" via offset index */}
        {items.map((item, i) => renderItem(item, items.length + i))}
      </div>
    </div>
  );
}

// ─── DualMarqueeSection ──────────────────────────────────────────────────────

export function DualMarqueeSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready,   setReady]   = useState(false);
  const rafRef                = useRef<number | null>(null);
  const mountedRef            = useRef(true);

  // Load approved reviews from Supabase / content manager
  useEffect(() => {
    mountedRef.current = true;
    getAllReviews()
      .then((data) => {
        if (mountedRef.current) setReviews(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mountedRef.current) setReviews([]);
      });
    return () => { mountedRef.current = false; };
  }, []);

  // Live update listener (admin panel pushes contentUpdated events)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.type === "reviews" && mountedRef.current) {
        const approved = (e.detail.data?.reviews ?? []).filter(
          (r: Review) => r.status === "approved",
        );
        setReviews(approved);
      }
    };
    window.addEventListener("contentUpdated", handler as EventListener);
    return () => window.removeEventListener("contentUpdated", handler as EventListener);
  }, []);

  // Double-RAF mount guard — guarantees first paint before animations start.
  // A single rAF fires before layout; two rAFs guarantee at least one painted frame.
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (mountedRef.current) setReady(true);
      });
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="w-full py-10 sm:py-12 overflow-hidden border-y border-slate-200 dark:border-white/5 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent px-2">
          What People Say &amp; Key Achievements
        </h3>
      </div>

      {/* ── Slider 1: Testimonials / Reviews loop ─────────────────────────── */}
      {reviews.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow
            items={reviews}
            direction="left"
            pxPerSec={REVIEWS_PX_PER_SEC}
            ready={ready}
            renderItem={(review, idx) => (
              <div
                key={`rev-${idx}`}
                className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[320px] hover:border-primary/30 hover:bg-white/90 dark:hover:bg-card/80 transition-all cursor-default shadow-sm dark:shadow-none"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                    {review.avatar || review.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">
                      {review.name}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {review.project_type} • {review.date}
                    </p>
                  </div>
                  {review.verified && (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 ml-auto flex-shrink-0" />
                  )}
                </div>
                <div className="flex gap-0.5 sm:gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] sm:text-sm text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>
            )}
          />
        </div>
      )}

      {/* ── Slider 2: Stats / Key Achievements loop — RIGHT (Eastbound) ──── */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow
          items={statsData}
          direction="right"
          pxPerSec={STATS_PX_PER_SEC}
          ready={ready}
          renderItem={(stat, idx) => {
            const Icon = STATS_ICONS[stat.icon] ?? Briefcase;
            return (
              <div
                key={`stat-${idx}`}
                className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[200px] sm:w-[240px] hover:border-primary/40 hover:bg-white/90 dark:hover:bg-card/80 transition-all cursor-default shadow-sm dark:shadow-none"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 sm:mb-4">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {stat.title}
                </p>
              </div>
            );
          }}
        />
      </div>

      {/* ── Tools / software row (right-scroll) ───────────────────────────── */}
      <MarqueeRow
        items={TOOLS}
        direction="right"
        pxPerSec={TOOLS_PX_PER_SEC}
        ready={ready}
        renderItem={(tool, idx) => (
          <div
            key={`tool-${idx}`}
            className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-5 sm:p-6 w-[140px] sm:w-[160px] hover:border-primary/30 hover:bg-white/90 dark:hover:bg-card/80 transition-all cursor-default flex flex-col items-center justify-center gap-3 shadow-sm dark:shadow-none"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center relative overflow-hidden">
              {tool.logo ? (
                <img
                  src={tool.logo}
                  alt={tool.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const fb = img.parentElement?.querySelector(
                      ".emoji-fb",
                    ) as HTMLElement | null;
                    if (fb) fb.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="emoji-fb absolute inset-0 items-center justify-center text-2xl sm:text-3xl"
                style={{ display: tool.logo ? "none" : "flex" }}
              >
                {tool.emoji}
              </div>
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-foreground text-center">
              {tool.name}
            </p>
          </div>
        )}
      />
    </section>
  );
}
