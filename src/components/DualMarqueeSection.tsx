// src/components/DualMarqueeSection.tsx
//
// ✅ NEW IN THIS VERSION:
//
//   HZ DETECTION ENGINE:
//     A `useEffect` on mount uses requestAnimationFrame timestamp diffing to
//     measure the actual screen refresh rate over ~60 frames (~1 second).
//     The detected Hz is snapped to the nearest standard tier (60/120/144/240)
//     and stored in a CSS custom property `--marquee-hz-scale` on <html>.
//     MarqueeRow durations are then multiplied by this scale factor so that
//     perceived scroll speed is visually identical at every refresh rate.
//
//   ECO / LOW-END DEVICE MODE:
//     Reads `yd_eco_mode` from localStorage and listens for the
//     `yd-perf-settings-changed` custom event emitted by SettingsModal.
//     When eco mode is ON:
//       • All three marquee rows are replaced with clean static grid cards
//       • No canvas, no animation, no `will-change`, no requestAnimationFrame
//       • The section still shows reviews, stats and tools — just as grids
//     When eco mode is OFF (default): behaviour is unchanged from before.
//
//   FRAME-RATE INDEPENDENCE (unchanged — CSS handles this):
//     CSS `animation-duration` is wall-clock seconds, not frame counts.
//     The Hz scale factor is an additive correction for monitors where
//     compositor interpolation causes perceived speed drift.

import { useEffect, useState, useRef } from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";

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
function duplicate<T>(arr: T[], times = 6): T[] {
  const out: T[] = [];
  for (let i = 0; i < times; i++) out.push(...arr);
  return out;
}

// ─── Fade edge mask ───────────────────────────────────────────────────────────
const MASK = "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)";

// ─── MarqueeRow ───────────────────────────────────────────────────────────────
interface MarqueeRowProps {
  /** Wall-clock seconds for one full loop at 60 Hz baseline. */
  baseDuration: number;
  /** Detected Hz scale factor — computed once on mount via rAF diffing. */
  hzScale: number;
  direction?: "left" | "right";
  children: React.ReactNode;
  ready: boolean;
}

function MarqueeRow({
  baseDuration, hzScale, direction = "left", children, ready,
}: MarqueeRowProps) {
  // Duration is scaled by hzScale so perceived speed is uniform across Hz tiers.
  // At 60 Hz: scale = 1.0 → duration unchanged.
  // At 120 Hz: scale = 2.0 → duration doubles → same pixels/second.
  // At 240 Hz: scale = 4.0 → duration quadruples → same pixels/second.
  const duration   = baseDuration * hzScale;
  const animName   = direction === "left" ? "marquee-scroll-left" : "marquee-scroll-right";

  return (
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          animation: ready ? animName + " " + duration + "s linear infinite" : "none",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Eco Mode — static review cards grid ─────────────────────────────────────
function EcoReviewGrid({ reviews }: { reviews: Review[] }) {
  const slice = reviews.slice(0, 6);
  if (slice.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {slice.map((review) => (
        <div
          key={review.id}
          className="bg-white/70 dark:bg-card/60 border border-slate-200 dark:border-white/10
                     rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20
                            flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
              {review.avatar || review.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-foreground text-xs truncate">{review.name}</h4>
              <p className="text-[10px] text-muted-foreground truncate">
                {review.project_type} • {review.date}
              </p>
            </div>
            {review.verified && <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />}
          </div>
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 flex-shrink-0 ${
                i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
              }`} />
            ))}
          </div>
          <p className="text-[11px] text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-2">
            &ldquo;{review.text}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Eco Mode — static stats grid ────────────────────────────────────────────
function EcoStatsGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsData.map((stat) => {
        const Icon = STATS_ICONS[stat.icon] || Briefcase;
        return (
          <div
            key={stat.id}
            className="bg-white/70 dark:bg-card/60 border border-primary/20 rounded-xl p-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent mb-1">
              {stat.value}
            </div>
            <p className="text-[11px] text-muted-foreground">{stat.title}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Eco Mode — static tools grid ────────────────────────────────────────────
function EcoToolsGrid() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {TOOLS.map((tool) => (
        <div
          key={tool.id}
          className="bg-white/70 dark:bg-card/60 border border-slate-200 dark:border-white/10
                     rounded-xl p-4 w-[130px] flex flex-col items-center gap-2.5 shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center relative overflow-hidden">
            <img
              src={tool.logo}
              alt={tool.name}
              className="w-9 h-9 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fb = img.parentElement && img.parentElement.querySelector(".emoji-fb") as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
            <div className="emoji-fb hidden absolute inset-0 items-center justify-center text-2xl">
              {tool.emoji}
            </div>
          </div>
          <p className="text-xs font-medium text-foreground text-center">{tool.name}</p>
        </div>
      ))}
    </div>
  );
}

// ─── DualMarqueeSection ───────────────────────────────────────────────────────
export function DualMarqueeSection() {
  const [reviews,     setReviews]     = useState<Review[]>([]);
  const [ready,       setReady]       = useState(false);
  const [hzScale,     setHzScale]     = useState(1);       // 1 = 60 Hz baseline
  const [detectedHz,  setDetectedHz]  = useState<number | null>(null);
  const [ecoMode,     setEcoMode]     = useState(() => {
    try { return localStorage.getItem(ECO_MODE_KEY) === "true"; } catch { return false; }
  });

  const rafRef      = useRef<number | null>(null);
  const mountedRef  = useRef(true);

  // ── Load approved reviews ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    getAllReviews()
      .then((data) => {
        if (mountedRef.current) setReviews(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (mountedRef.current) setReviews([]); });
    return () => { mountedRef.current = false; };
  }, []);

  // ── Live content update listener ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail && e.detail.type === "reviews" && mountedRef.current) {
        const approved = (
          (e.detail.data && e.detail.data.reviews) ? e.detail.data.reviews : []
        ).filter((r: Review) => r.status === "approved");
        setReviews(approved);
      }
    };
    window.addEventListener("contentUpdated", handler as EventListener);
    return () => window.removeEventListener("contentUpdated", handler as EventListener);
  }, []);

  // ── Eco mode listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  // ── Hz detection via rAF timestamp diffing ────────────────────────────────
  // Measures actual screen refresh rate over ~60 frames (~1 second).
  // Snaps to the nearest standard Hz tier: 60 / 120 / 144 / 240.
  // Sets `hzScale = detectedHz / 60` so animation durations scale proportionally,
  // ensuring identical perceived scroll speed on every display.
  useEffect(() => {
    if (ecoMode) return; // Skip Hz detection in eco mode — no animations

    let frames    = 0;
    let startTime = -1;
    let rafId: number;

    const measure = (timestamp: number) => {
      if (startTime < 0) { startTime = timestamp; }
      frames++;

      const elapsed = timestamp - startTime;

      if (elapsed < 1000 && frames < 120) {
        rafId = requestAnimationFrame(measure);
        return;
      }

      // Calculate actual fps
      const fps = Math.round((frames * 1000) / elapsed);

      // Snap to nearest standard tier
      let hz: number;
      if      (fps >= 200) hz = 240;
      else if (fps >= 120) hz = 144;
      else if (fps >= 90)  hz = 120;
      else                 hz = 60;

      // Scale = hz / 60 baseline
      // Higher Hz → longer duration → same pixels/second of scroll
      const scale = hz / 60;

      if (mountedRef.current) {
        setDetectedHz(hz);
        setHzScale(scale);
      }

      // Expose as CSS custom property for any CSS-driven animation consumers
      document.documentElement.style.setProperty("--marquee-hz-scale", String(scale));
      document.documentElement.setAttribute("data-hz", String(hz));
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [ecoMode]);

  // ── Double-RAF mount guard (prevents white-on-load artifact) ─────────────
  useEffect(() => {
    if (ecoMode) { setReady(true); return; }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (mountedRef.current) setReady(true);
      });
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [ecoMode]);

  // ── Prepare duplicated data sets ──────────────────────────────────────────
  const dupReviews = duplicate(reviews, reviews.length > 0 ? 6 : 0);
  const dupStats   = duplicate(statsData, 6);
  const dupTools   = duplicate(TOOLS, 8);

  // ─────────────────────────────────────────────────────────────────────────
  // ECO MODE: static layout — no animations, no canvas, no marquees
  // ─────────────────────────────────────────────────────────────────────────
  if (ecoMode) {
    return (
      <section className="w-full py-10 sm:py-12 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              What People Say &amp; Key Achievements
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              ⚡ Low-End Device Mode — static layout active
            </p>
          </div>

          {/* Static reviews grid */}
          {reviews.length > 0 && <EcoReviewGrid reviews={reviews} />}

          {/* Static stats grid */}
          <EcoStatsGrid />

          {/* Static tools grid */}
          <EcoToolsGrid />
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NORMAL MODE: animated marquees with Hz-scaled durations
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="w-full py-10 sm:py-12 overflow-hidden border-y border-slate-200 dark:border-white/5 relative">

      {/* Section heading */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent px-2">
          What People Say &amp; Key Achievements
        </h3>
        {/* Hz badge — subtle debug info for power users */}
        {detectedHz !== null && (
          <p className="text-[10px] text-center text-muted-foreground/40 mt-1 tabular-nums">
            Display: {detectedHz} Hz
          </p>
        )}
      </div>

      {/* Row 1: Reviews (90 s base, left) */}
      {dupReviews.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow baseDuration={90} hzScale={hzScale} direction="left" ready={ready}>
            {dupReviews.map((review, idx) => (
              <div
                key={"rev-" + review.id + "-" + idx}
                className="flex-shrink-0 bg-white/70 dark:bg-card/60 backdrop-blur-sm
                           border border-slate-200 dark:border-white/10
                           rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[320px]
                           hover:border-primary/30 hover:bg-white/90 dark:hover:bg-card/80
                           transition-all cursor-default shadow-sm dark:shadow-none"
              >
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
                <div className="flex gap-0.5 sm:gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-muted text-muted"
                    }`} />
                  ))}
                </div>
                <p className="text-[11px] sm:text-sm text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>
            ))}
          </MarqueeRow>
        </div>
      )}

      {/* Row 2: Stats (80 s base, left) */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow baseDuration={80} hzScale={hzScale} direction="left" ready={ready}>
          {dupStats.map((stat, idx) => {
            const Icon = STATS_ICONS[stat.icon] || Briefcase;
            return (
              <div
                key={"stat-" + stat.id + "-" + idx}
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

      {/* Row 3: Tools (80 s base, right) */}
      <MarqueeRow baseDuration={80} hzScale={hzScale} direction="right" ready={ready}>
        {dupTools.map((tool, idx) => (
          <div
            key={"tool-" + tool.name + "-" + idx}
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
                  const fb = img.parentElement && img.parentElement.querySelector(".emoji-fb") as HTMLElement | null;
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
