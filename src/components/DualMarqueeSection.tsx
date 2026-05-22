// src/components/DualMarqueeSection.tsx
//
// ✅ FRAME-RATE INDEPENDENCE — HOW IT WORKS:
//
//   CSS `animation-duration` is measured in WALL-CLOCK SECONDS, not frame counts.
//   The browser scheduler maps a 90-second animation to exactly 90 seconds
//   regardless of whether the display refreshes at 30 Hz, 60 Hz, 144 Hz, or 240 Hz.
//
//   This file uses ONLY the CSS @keyframes defined in index.css:
//     @keyframes marquee-scroll-left  { 0% → translate3d(0,0,0) → 100% → translate3d(-50%,0,0) }
//     @keyframes marquee-scroll-right { 0% → translate3d(-50%,0,0) → 100% → translate3d(0,0,0) }
//
//   There is NO requestAnimationFrame loop, NO JS position accumulation, and NO
//   delta-time math in this component — the CSS engine handles everything.
//
//   `will-change: transform` and `translate3d` promote each track to its own
//   GPU compositor layer so the animation runs off the main thread entirely,
//   which eliminates jank from JS work on the main thread.
//
//   The `ready` flag (double-RAF mount guard) ensures the animation class is
//   applied AFTER the first paint so the track is never invisible on initial load.

import { useEffect, useState, useRef } from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const STATS_ICONS: Record<string, React.ElementType> = {
  briefcase: Briefcase, users: Users, clock: Clock,  star: Star,
  gamepad:   Gamepad,   zap: Zap,     refresh: RefreshCw, repeat: Repeat,
};

// ─── Tools ───────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: 1, name: "Photoshop",     logo: "/images/global/photoshop.png",     emoji: "🖼️" },
  { id: 2, name: "Figma",         logo: "/images/global/figma.png",         emoji: "🎨" },
  { id: 3, name: "Roblox Studio", logo: "/images/global/roblox-studio.png", emoji: "🎮" },
];

// ─── Track duplication ────────────────────────────────────────────────────────
// The track is filled with 2× (or more) copies of the item set.
// Animation keyframe goes from 0 → -50%, which is exactly one set's width.
// This creates a seamless infinite loop with zero gap.
function duplicate<T>(arr: T[], times = 6): T[] {
  const out: T[] = [];
  for (let i = 0; i < times; i++) out.push(...arr);
  return out;
}

// ─── Fade edge mask ───────────────────────────────────────────────────────────
const MASK = "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)";

// ─── MarqueeRow ───────────────────────────────────────────────────────────────
interface MarqueeRowProps {
  /** Wall-clock seconds for one full loop. Frame-rate independent. */
  duration: number;
  direction?: "left" | "right";
  children: React.ReactNode;
  ready: boolean;
}

function MarqueeRow({ duration, direction = "left", children, ready }: MarqueeRowProps) {
  const animName = direction === "left" ? "marquee-scroll-left" : "marquee-scroll-right";
  return (
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          // `animation` is NOT applied until `ready` is true (post-first-paint).
          // This prevents the frozen-on-load artifact on slow connections.
          animation: ready ? `${animName} ${duration}s linear infinite` : "none",
          willChange: "transform",
          // translate3d promotes to a GPU compositor layer → off-main-thread rendering
          transform: "translate3d(0, 0, 0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── DualMarqueeSection ───────────────────────────────────────────────────────
export function DualMarqueeSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready,   setReady]   = useState(false);
  const rafRef    = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // ── Load approved reviews from DB ────────────────────────────────────────
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

  // ── Live update listener ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.type === "reviews" && mountedRef.current) {
        const approved = (e.detail.data?.reviews ?? []).filter(
          (r: Review) => r.status === "approved"
        );
        setReviews(approved);
      }
    };
    window.addEventListener("contentUpdated", handler as EventListener);
    return () => window.removeEventListener("contentUpdated", handler as EventListener);
  }, []);

  // ── Double-RAF mount guard ────────────────────────────────────────────────
  // Two nested rAF calls guarantee the browser has completed at least one full
  // paint before we start the CSS animation. Without this guard the track can
  // appear white/invisible on first render in Chromium.
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

  // ── Prepare data sets ────────────────────────────────────────────────────
  const dupReviews = duplicate(reviews, reviews.length > 0 ? 6 : 0);
  const dupStats   = duplicate(statsData, 6);
  const dupTools   = duplicate(TOOLS, 8);

  return (
    <section className="w-full py-10 sm:py-12 overflow-hidden border-y border-slate-200 dark:border-white/5 relative">
      {/* ── Section heading ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent px-2">
          What People Say &amp; Key Achievements
        </h3>
      </div>

      {/* ── Row 1: Reviews (90 s, left) ──────────────────────────────────── */}
      {dupReviews.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow duration={90} direction="left" ready={ready}>
            {dupReviews.map((review, idx) => (
              <div
                key={`rev-${review.id}-${idx}`}
                className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm
                           border border-slate-200 dark:border-white/10
                           rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[320px]
                           hover:border-primary/30 hover:bg-white/90 dark:hover:bg-card/80
                           transition-all cursor-default shadow-sm dark:shadow-none"
              >
                {/* Avatar + meta */}
                <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full
                                  bg-gradient-to-br from-primary/20 to-secondary/20
                                  flex items-center justify-center text-primary
                                  font-bold text-xs sm:text-sm flex-shrink-0">
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
                {/* Stars */}
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
                {/* Text */}
                <p className="text-[11px] sm:text-sm text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>
            ))}
          </MarqueeRow>
        </div>
      )}

      {/* ── Row 2: Stats (80 s, left) ────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow duration={80} direction="left" ready={ready}>
          {dupStats.map((stat, idx) => {
            const Icon = STATS_ICONS[stat.icon] ?? Briefcase;
            return (
              <div
                key={`stat-${stat.id}-${idx}`}
                className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm
                           border border-primary/20 rounded-xl sm:rounded-2xl
                           p-4 sm:p-5 w-[200px] sm:w-[240px]
                           hover:border-primary/40 hover:bg-white/90 dark:hover:bg-card/80
                           transition-all cursor-default shadow-sm dark:shadow-none"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10
                                flex items-center justify-center text-primary mb-3 sm:mb-4">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-bold
                                bg-gradient-to-r from-primary to-indigo-400
                                bg-clip-text text-transparent mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.title}</p>
              </div>
            );
          })}
        </MarqueeRow>
      </div>

      {/* ── Row 3: Tools (80 s, right) ───────────────────────────────────── */}
      <MarqueeRow duration={80} direction="right" ready={ready}>
        {dupTools.map((tool, idx) => (
          <div
            key={`tool-${tool.name}-${idx}`}
            className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm
                       border border-slate-200 dark:border-white/10
                       rounded-xl sm:rounded-2xl p-5 sm:p-6 w-[140px] sm:w-[160px]
                       hover:border-primary/30 hover:bg-white/90 dark:hover:bg-card/80
                       transition-all cursor-default flex flex-col items-center
                       justify-center gap-3 shadow-sm dark:shadow-none"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10
                            flex items-center justify-center relative overflow-hidden">
              <img
                src={tool.logo}
                alt={tool.name}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fb = img.parentElement?.querySelector(".emoji-fb") as HTMLElement | null;
                  if (fb) fb.style.display = "flex";
                }}
              />
              <div className="emoji-fb hidden absolute inset-0 items-center justify-center text-2xl sm:text-3xl">
                {tool.emoji}
              </div>
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-foreground text-center">
              {tool.name}
            </p>
          </div>
        ))}
      </MarqueeRow>
    </section>
  );
}
