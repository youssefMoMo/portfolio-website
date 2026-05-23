// src/components/DualMarqueeSection.tsx
//
// ─── REWRITE NOTES ────────────────────────────────────────────────────────────
//
//  HYDRATION / SSR
//    • `ecoMode` initialises as `false` (SSR-safe constant), then a single
//      `useEffect` on mount reads localStorage. Zero hydration mismatches.
//    • All window/localStorage access is gated behind `useEffect`.
//
//  ANIMATION
//    • Hz-detection rAF loop removed entirely. CSS `animation-duration` is
//      wall-clock seconds; the compositor drives the loop at whatever Hz the
//      display runs — perceived speed is already frame-rate–independent.
//    • `@keyframes` are embedded in a `<style>` tag so the file is
//      100 % self-contained (no global CSS dependency).
//    • `translate3d(0,0,0)` promotes each track to its own compositor layer.
//    • `will-change: transform` is set only on the moving track element.
//    • No `backdrop-filter` on the moving cards — compositor layer explosions
//      eliminated.
//
//  DOM SIZE
//    • Each row duplicates its data exactly once (2 × original length).
//      The keyframe travels 0 % → −50 %, so when the second copy exits left
//      the visual position is identical to the start — seamless, minimal DOM.
//
//  INTERSECTION OBSERVER
//    • `animationPlayState` is `"paused"` whenever the section is not
//      intersecting the viewport. Zero CPU/GPU waste off-screen.
//
//  TYPESCRIPT
//    • Explicit interfaces for `ToolDef`, `ContentUpdatedDetail`.
//    • `CustomEvent<ContentUpdatedDetail>` cast — no `as EventListener`.
//    • Optional chaining on all deep fields (`review.avatar`, `detail.data`).
//
//  CLS / AVATAR STABILITY
//    • `Avatar` wrapper always renders a fixed 36 × 36 box.
//    • `ToolCard` icon wrapper is always 56 × 56.
//    • Fallback (emoji / initial) is `position:absolute` inside the same
//      box — layout never shifts on image-load failure.
//
//  EDGE MASK
//    • Uses CSS alpha mask (`transparent` → `black`). Alpha is theme-agnostic;
//      works identically in light and dark mode.

import { useEffect, useState, useRef } from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData, type Stat } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";

// ─── Embedded keyframes ───────────────────────────────────────────────────────
// Two directions; each track holds 2× the original items so the animation
// only needs to travel −50% to produce a seamless infinite loop.
const KEYFRAMES = `
@keyframes marquee-left {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
@keyframes marquee-right {
  from { transform: translate3d(-50%, 0, 0); }
  to   { transform: translate3d(0, 0, 0); }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ToolDef {
  id: number;
  name: string;
  logo: string;
  emoji: string;
}

/** Shape carried by the "contentUpdated" CustomEvent detail field. */
interface ContentUpdatedDetail {
  type: string;
  data?: { reviews?: Review[] };
}

// ─── Static data ──────────────────────────────────────────────────────────────
const STATS_ICONS: Record<string, React.ElementType> = {
  briefcase: Briefcase,
  users:     Users,
  clock:     Clock,
  star:      Star,
  gamepad:   Gamepad,
  zap:       Zap,
  refresh:   RefreshCw,
  repeat:    Repeat,
};

const TOOLS: ToolDef[] = [
  { id: 1, name: "Photoshop",     logo: "/images/global/photoshop.png",     emoji: "🖼️" },
  { id: 2, name: "Figma",         logo: "/images/global/figma.png",         emoji: "🎨" },
  { id: 3, name: "Roblox Studio", logo: "/images/global/roblox-studio.png", emoji: "🎮" },
];

// ─── Edge-fade mask ───────────────────────────────────────────────────────────
// CSS mask uses the alpha channel of the gradient, not colour — works
// identically in light mode and dark mode.
const EDGE_MASK =
  "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)";

// ─── MarqueeRow ───────────────────────────────────────────────────────────────
interface MarqueeRowProps {
  /** Wall-clock seconds for one full loop. */
  duration: number;
  direction?: "left" | "right";
  /**
   * Controls `animation-play-state`.
   * Pass `false` when the section is off-screen or before client mount.
   */
  running: boolean;
  children: React.ReactNode;
}

function MarqueeRow({
  duration,
  direction = "left",
  running,
  children,
}: MarqueeRowProps) {
  const animName = direction === "left" ? "marquee-left" : "marquee-right";

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          animation: `${animName} ${duration}s linear infinite`,
          animationPlayState: running ? "running" : "paused",
          willChange: "transform",
          // Promote to compositor layer immediately — no jank on first frame.
          transform: "translate3d(0, 0, 0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
// Fixed 36 × 36 px box. Both the <img> and the fallback <span> are
// `position: absolute` so the container never resizes → zero CLS.
interface AvatarProps {
  src?: string;
  name: string;
}

function Avatar({ src, name }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="relative flex-shrink-0 rounded-full overflow-hidden
                 bg-gradient-to-br from-primary/20 to-secondary/20"
      style={{ width: 36, height: 36 }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      {/* Fallback: visible when no src, or after image load error */}
      <span
        className="absolute inset-0 items-center justify-center
                   text-primary font-bold text-xs select-none"
        // Hidden when an img is present (shown via onError DOM manipulation)
        style={{ display: src ? "none" : "flex" }}
        aria-hidden="true"
      >
        {initial}
      </span>
    </div>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────
// Extracted so eco-mode grids and animated marquees share identical markup.

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      className="flex-shrink-0 bg-white/80 dark:bg-card/70
                 border border-slate-200 dark:border-white/10
                 rounded-xl sm:rounded-2xl p-4 sm:p-5
                 w-[280px] sm:w-[310px]
                 hover:border-primary/30 hover:bg-white/95
                 dark:hover:bg-card/85 transition-colors
                 cursor-default shadow-sm dark:shadow-none"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar src={review.avatar} name={review.name} />
        <div className="min-w-0">
          <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">
            {review.name}
          </h4>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {review.project_type} • {review.date}
          </p>
        </div>
        {review.verified && (
          <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />
        )}
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 sm:gap-1 mb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              i < review.rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-[11px] sm:text-sm text-slate-700 dark:text-zinc-400
                   leading-relaxed line-clamp-2">
        &ldquo;{review.text}&rdquo;
      </p>
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = STATS_ICONS[stat.icon] ?? Briefcase;
  return (
    <div
      className="flex-shrink-0 bg-white/80 dark:bg-card/70
                 border border-primary/20 rounded-xl sm:rounded-2xl
                 p-4 sm:p-5 w-[200px] sm:w-[230px]
                 hover:border-primary/40 hover:bg-white/95
                 dark:hover:bg-card/85 transition-colors
                 cursor-default shadow-sm dark:shadow-none"
    >
      <div
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10
                   flex items-center justify-center text-primary mb-3"
      >
        <Icon className="w-5 h-5" />
      </div>
      <div
        className="text-2xl sm:text-3xl font-bold
                   bg-gradient-to-r from-primary to-indigo-400
                   bg-clip-text text-transparent mb-1"
      >
        {stat.value}
      </div>
      <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.title}</p>
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolDef }) {
  return (
    <div
      className="flex-shrink-0 bg-white/80 dark:bg-card/70
                 border border-slate-200 dark:border-white/10
                 rounded-xl sm:rounded-2xl p-5 sm:p-6
                 w-[140px] sm:w-[160px]
                 flex flex-col items-center justify-center gap-3
                 hover:border-primary/30 hover:bg-white/95
                 dark:hover:bg-card/85 transition-colors
                 cursor-default shadow-sm dark:shadow-none"
    >
      {/* Fixed 56 × 56 icon wrapper — prevents CLS on img fail */}
      <div
        className="relative rounded-xl bg-primary/10 overflow-hidden
                   flex items-center justify-center"
        style={{ width: 56, height: 56 }}
      >
        <img
          src={tool.logo}
          alt={tool.name}
          className="absolute w-8 h-8 sm:w-9 sm:h-9 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        {/* Emoji fallback — same fixed-size box, zero layout shift */}
        <span
          className="absolute inset-0 items-center justify-center
                     text-2xl select-none"
          style={{ display: "none" }}
          aria-hidden="true"
        >
          {tool.emoji}
        </span>
      </div>
      <p className="text-[11px] sm:text-xs font-medium text-foreground text-center">
        {tool.name}
      </p>
    </div>
  );
}

// ─── Eco-mode static grids ────────────────────────────────────────────────────
function EcoReviewGrid({ reviews }: { reviews: Review[] }) {
  const slice = reviews.slice(0, 6);
  if (!slice.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {slice.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

function EcoStatsGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsData.map((s) => (
        <StatCard key={s.id} stat={s} />
      ))}
    </div>
  );
}

function EcoToolsGrid() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {TOOLS.map((t) => (
        <ToolCard key={t.id} tool={t} />
      ))}
    </div>
  );
}

// ─── DualMarqueeSection ───────────────────────────────────────────────────────
export function DualMarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // SSR-safe initial values — no localStorage reads at declaration time.
  const [ecoMode, setEcoMode] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  /** Becomes `true` after the first client-side animation frame. */
  const [ready,   setReady]   = useState(false);
  /** Tracks viewport intersection for auto-pause. */
  const [inView,  setInView]  = useState(true);

  // ── Client mount ─────────────────────────────────────────────────────────
  // Single effect handles: localStorage read, ready flag.
  // Nothing that touches `window` or `localStorage` runs during SSR.
  useEffect(() => {
    try {
      setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true");
    } catch {
      // Silently ignore — SSR or private-browsing restrictions.
    }

    // One rAF ensures the browser has committed at least one frame before
    // we flip animationPlayState to "running". Prevents white-flash artefact.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Fetch approved reviews ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getAllReviews()
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setReviews(list.filter((r: Review) => r.status === "approved"));
      })
      .catch(() => {
        if (alive) setReviews([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // ── Live content updates ──────────────────────────────────────────────────
  // CustomEvent is typed cleanly; no `as EventListener` cast needed.
  useEffect(() => {
    const handler = (raw: Event) => {
      const { detail } = raw as CustomEvent<ContentUpdatedDetail>;
      if (detail?.type !== "reviews") return;
      const updated = (detail.data?.reviews ?? []).filter(
        (r: Review) => r.status === "approved"
      );
      setReviews(updated);
    };
    window.addEventListener("contentUpdated", handler);
    return () => window.removeEventListener("contentUpdated", handler);
  }, []);

  // ── Eco mode toggle ───────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try {
        setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true");
      } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  // ── IntersectionObserver: pause animations when off-screen ───────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Minimal duplication (2× only) ────────────────────────────────────────
  // The keyframe travels 0 → −50 %. Two copies of the data fill the track,
  // so at −50 % the visual content matches the start exactly — seamless loop.
  // DOM node count is the absolute minimum needed for the effect.
  const dupReviews = reviews.length > 0 ? [...reviews, ...reviews] : [];
  const dupStats   = [...statsData, ...statsData];
  const dupTools   = [...TOOLS,     ...TOOLS];

  // Animations run only when the client has mounted, the section is visible,
  // and eco mode is off.
  const running = ready && inView && !ecoMode;

  // ─── ECO MODE ─────────────────────────────────────────────────────────────
  if (ecoMode) {
    return (
      <section className="w-full py-10 sm:py-12 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h3
              className="text-lg sm:text-xl md:text-2xl font-bold
                         bg-gradient-to-r from-primary via-indigo-400 to-cyan-400
                         bg-clip-text text-transparent"
            >
              What People Say &amp; Key Achievements
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              ⚡ Low-End Device Mode — static layout active
            </p>
          </div>

          {reviews.length > 0 && <EcoReviewGrid reviews={reviews} />}
          <EcoStatsGrid />
          <EcoToolsGrid />
        </div>
      </section>
    );
  }

  // ─── NORMAL MODE: animated marquees ───────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      className="w-full py-10 sm:py-12 overflow-hidden
                 border-y border-slate-200 dark:border-white/5 relative"
    >
      {/* Self-contained keyframes — no dependency on globals.css */}
      <style>{KEYFRAMES}</style>

      {/* Section heading */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3
          className="text-lg sm:text-xl md:text-2xl font-display font-bold
                     text-center px-2
                     bg-gradient-to-r from-primary via-indigo-400 to-cyan-400
                     bg-clip-text text-transparent"
        >
          What People Say &amp; Key Achievements
        </h3>
      </div>

      {/* ── Row 1: Reviews — scrolls left ──────────────────────────────── */}
      {dupReviews.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow duration={90} direction="left" running={running}>
            {dupReviews.map((r, i) => (
              <ReviewCard key={`rev-${r.id}-${i}`} review={r} />
            ))}
          </MarqueeRow>
        </div>
      )}

      {/* ── Row 2: Stats — scrolls left ────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow duration={80} direction="left" running={running}>
          {dupStats.map((s, i) => (
            <StatCard key={`stat-${s.id}-${i}`} stat={s} />
          ))}
        </MarqueeRow>
      </div>

      {/* ── Row 3: Tools — scrolls right ───────────────────────────────── */}
      <MarqueeRow duration={80} direction="right" running={running}>
        {dupTools.map((t, i) => (
          <ToolCard key={`tool-${t.id}-${i}`} tool={t} />
        ))}
      </MarqueeRow>
    </section>
  );
}
