// src/components/DualMarqueeSection.tsx
//
// ─── OVERHAUL CHANGELOG ───────────────────────────────────────────────────────
//
// DIRECTIVE 1 — Locale-Aware Dual-Direction Sweeping (all 3 rows)
//   EN / ES (LTR): ALL rows initialise at translate3d(0,0,0) and animate to
//                  translate3d(-50%,0,0). Content disappears off LEFT edge.
//   AR    (RTL):   ALL rows initialise at translate3d(-50%,0,0) and animate to
//                  translate3d(0,0,0). Content disappears off RIGHT edge.
//
//   ── Row 3 root-cause fix:
//      TOOLS has 3 items. With only 2 duplicates (6 cards ≈ 1 104 px) the
//      -50% keyframe translates only ~552 px — far less than a 1 440 px+
//      viewport. The container showed blank space, making Row 3 appear frozen.
//      Fix: TOOLS is repeated TOOL_FILL (= 16) times, split evenly into two
//      identical halves so the seamless-loop invariant (half-width ≥ viewport)
//      holds at up to 4 K displays.
//
//   ── CLS guarantee:
//      The initial inline `transform` always mirrors the keyframe `from` value,
//      so the very first painted frame is identical to animation frame 0 → zero
//      layout shift on cold load.
//
// DIRECTIVE 2 — Performance
//   • Tool images: loading="lazy" + fetchpriority="low" + decoding="async"
//   • All img fallback paths kept identical to before.
//   • Avatar / ReviewCard / StatCard / ToolCard wrapped in React.memo to prevent
//     unnecessary re-renders when parent state (ecoMode, inView) changes.
//   • IntersectionObserver pauses all three rows when section scrolls off-screen,
//     eliminating off-screen GPU compositing.
//   • willChange:"transform" and backfaceVisibility:"hidden" confined to the
//     animating element (not the container), matching best-practice compositor
//     layer budget.

import React, {
  memo, useEffect, useState, useRef, useMemo,
} from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData, type Stat } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager.ts";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";
import { useLanguage } from "@/hooks/use-language";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolDef {
  id:    number;
  name:  string;
  logo:  string;
  emoji: string;
}

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

// ─── Row-3 fill factor ────────────────────────────────────────────────────────
//
// TOOLS has only 3 items. Each card is ~160 px wide + 24 px gap = ~184 px.
// For the -50% loop trick to be seamless at any viewport (including 4 K):
//   one_half_width ≥ max_viewport  →  (FILL/2 * 3) * 184 ≥ 3 840
//   FILL/2 ≥ 3 840 / (3 * 184) ≈ 6.96  →  FILL/2 = 8  →  FILL = 16
//
// We flatten FILL copies of TOOLS so the total track = 16 * 3 = 48 cards.
// The animation translates from 0 → -50% (= 24 cards), which comfortably
// covers any viewport width up to ≈ 4 K (24 * 184 = 4 416 px).
const TOOL_FILL = 16;

// ─── Edge-fade mask (alpha-only, theme-agnostic) ──────────────────────────────

const EDGE_MASK =
  "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)";

// ─── Dynamic keyframe builder ─────────────────────────────────────────────────
//
// RTL (Arabic) : track starts at -50% (left edge) and crawls right to 0 %.
//                Visually, content sweeps from invisible-left to invisible-right.
// LTR (en, es) : track starts at 0 % and crawls left to -50 %.
//                Content sweeps from invisible-right to invisible-left.
//
// The name encodes direction → switching language triggers a fresh @keyframes
// injection so the browser immediately applies the new direction.

function buildKeyframes(isRTL: boolean): { css: string; name: string } {
  const name = isRTL ? "marquee-rtl-scroll" : "marquee-ltr-scroll";
  const css  = isRTL
    ? `@keyframes ${name} {
        from { transform: translate3d(-50%, 0, 0); }
        to   { transform: translate3d(0,    0, 0); }
      }`
    : `@keyframes ${name} {
        from { transform: translate3d(0,    0, 0); }
        to   { transform: translate3d(-50%, 0, 0); }
      }`;
  return { css, name };
}

// ─── MarqueeRow ───────────────────────────────────────────────────────────────

interface MarqueeRowProps {
  duration: number;
  running:  boolean;
  animName: string;
  initialX: string; // "0%" | "-50%" — must match keyframe `from`
  children: React.ReactNode;
}

const MarqueeRow = memo(function MarqueeRow({
  duration, running, animName, initialX, children,
}: MarqueeRowProps) {
  // Derive the initial transform from initialX once — avoids string comparison
  // on every render (trivially cheap but keeps intent explicit).
  const initialTransform =
    initialX === "0%" ? "translate3d(0,0,0)" : "translate3d(-50%,0,0)";

  return (
    // dir="ltr" pins the CSS axis to left-origin. RTL reversal is done
    // exclusively in the keyframe direction, never in layout axis.
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          // ── CLS guarantee ────────────────────────────────────────────────
          // Initial inline transform MUST equal keyframe `from`. The browser
          // paints this element BEFORE firing the first animation frame. If
          // these values differ the element jumps on frame 1 — visible CLS.
          transform:              initialTransform,
          animation:              `${animName} ${duration}s linear infinite`,
          animationPlayState:     running ? "running" : "paused",
          willChange:             "transform",
          backfaceVisibility:     "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps { src?: string; name: string }

const Avatar = memo(function Avatar({ src, name }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20"
      style={{ width: 36, height: 36 }}
    >
      {src && !imgFailed ? (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : null}
      {(!src || imgFailed) && (
        <span
          className="absolute inset-0 flex items-center justify-center text-primary font-bold text-xs select-none"
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </div>
  );
});

// ─── Card components ──────────────────────────────────────────────────────────

const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 bg-white/80 dark:bg-card/70 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[310px] hover:border-primary/30 hover:bg-white/95 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar src={review.avatar} name={review.name} />
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 dark:text-foreground text-xs sm:text-sm truncate">
            {review.name}
          </h4>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-muted-foreground truncate">
            {review.project_type} • {review.date}
          </p>
        </div>
        {review.verified && (
          <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />
        )}
      </div>
      <div className="flex gap-0.5 sm:gap-1 mb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              i < review.rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-neutral-300 text-neutral-300 dark:fill-neutral-600 dark:text-neutral-600"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] sm:text-sm text-slate-700 dark:text-zinc-400 leading-relaxed line-clamp-2">
        &ldquo;{review.text}&rdquo;
      </p>
    </div>
  );
});

const StatCard = memo(function StatCard({ stat, title }: { stat: Stat; title: string }) {
  const Icon = STATS_ICONS[stat.icon] ?? Briefcase;
  return (
    <div className="flex-shrink-0 bg-white/80 dark:bg-card/70 border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[200px] sm:w-[230px] hover:border-primary/40 hover:bg-white/95 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent mb-1">
        {stat.value}
      </div>
      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-muted-foreground">{title}</p>
    </div>
  );
});

const ToolCard = memo(function ToolCard({ tool }: { tool: ToolDef }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex-shrink-0 bg-white/80 dark:bg-card/70 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-5 sm:p-6 w-[140px] sm:w-[160px] flex flex-col items-center justify-center gap-3 hover:border-primary/30 hover:bg-white/95 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
      <div
        className="relative rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center"
        style={{ width: 56, height: 56 }}
      >
        {!imgFailed ? (
          <img
            src={tool.logo}
            alt={tool.name}
            className="absolute w-8 h-8 sm:w-9 sm:h-9 object-contain"
            // ── Perf: tool logos are below the fold — lazy-load, async decode,
            //    low fetch-priority so they never contend with LCP candidates.
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-2xl select-none"
            aria-hidden="true"
          >
            {tool.emoji}
          </span>
        )}
      </div>
      <p className="text-[11px] sm:text-xs font-medium text-slate-800 dark:text-foreground text-center">
        {tool.name}
      </p>
    </div>
  );
});

// ─── Eco-mode static grids ────────────────────────────────────────────────────

const EcoReviewGrid = memo(function EcoReviewGrid({ reviews }: { reviews: Review[] }) {
  const slice = reviews.slice(0, 6);
  if (!slice.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {slice.map((r) => <ReviewCard key={r.id} review={r} />)}
    </div>
  );
});

const EcoStatsGrid = memo(function EcoStatsGrid({
  statTitles,
}: { statTitles: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsData.map((s) => (
        <StatCard key={s.id} stat={s} title={statTitles[s.icon] ?? s.title} />
      ))}
    </div>
  );
});

const EcoToolsGrid = memo(function EcoToolsGrid() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {TOOLS.map((t) => <ToolCard key={t.id} tool={t} />)}
    </div>
  );
});

// ─── Filled tool array (Row 3 fix) ───────────────────────────────────────────
//
// Build TOOL_FILL flat copies of TOOLS keyed by position index.
// These are module-level constants — created once, never re-allocated.
// The key `tool-${toolId}-${copyIndex}` is stable across renders.
const DUP_TOOLS: Array<ToolDef & { _copyIdx: number }> = Array.from(
  { length: TOOL_FILL },
  (_, copyIdx) => TOOLS.map((t) => ({ ...t, _copyIdx: copyIdx })),
).flat();

// ─── DualMarqueeSection ───────────────────────────────────────────────────────

export function DualMarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { t, isRTL, lang } = useLanguage();

  // Build localized stat title lookup — updates instantly on language change
  const statTitles: Record<string, string> = useMemo(
    () => ({
      briefcase: t("stat.briefcase"),
      users:     t("stat.users"),
      clock:     t("stat.clock"),
      star:      t("stat.star"),
      gamepad:   t("stat.gamepad"),
      zap:       t("stat.zap"),
      refresh:   t("stat.refresh"),
      repeat:    t("stat.repeat"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  // ── Keyframe injection ─────────────────────────────────────────────────────
  // Recomputed only when isRTL changes. A new kfName forces the browser to
  // restart the animation with the correct direction on locale switch.
  const { css: kfCSS, name: kfName } = useMemo(
    () => buildKeyframes(isRTL),
    [isRTL],
  );

  // ── CLS: initial position MUST equal keyframe `from` ──────────────────────
  // LTR: `from` = translate3d(0,0,0)    → initialX = "0%"
  // RTL: `from` = translate3d(-50%,0,0) → initialX = "-50%"
  const initialX = isRTL ? "-50%" : "0%";

  // ── Local state ────────────────────────────────────────────────────────────
  const [ecoMode, setEcoMode] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready,   setReady]   = useState(false);
  const [inView,  setInView]  = useState(true);

  // ── Boot: read eco-mode + defer animation start by 1 rAF ──────────────────
  useEffect(() => {
    try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Fetch approved reviews ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getAllReviews()
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setReviews(list.filter((r: Review) => r.status === "approved"));
      })
      .catch(() => { if (alive) setReviews([]); });
    return () => { alive = false; };
  }, []);

  // ── Real-time review updates ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (raw: Event) => {
      const { detail } = raw as CustomEvent<ContentUpdatedDetail>;
      if (detail?.type !== "reviews") return;
      const updated = (detail.data?.reviews ?? []).filter(
        (r: Review) => r.status === "approved",
      );
      setReviews(updated);
    };
    window.addEventListener("contentUpdated", handler);
    return () => window.removeEventListener("contentUpdated", handler);
  }, []);

  // ── Eco-mode event bus ─────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  // ── IntersectionObserver — pause GPU work when off-screen ─────────────────
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

  // ── Build duplicated track arrays ──────────────────────────────────────────
  // Reviews + Stats stay with 2x duplication (they have many items already).
  // Tools use the pre-filled DUP_TOOLS (TOOL_FILL = 16 copies).
  const dupReviews = reviews.length > 0 ? [...reviews, ...reviews] : [];
  const dupStats   = [...statsData, ...statsData];
  // DUP_TOOLS is already filled — use directly (no additional spread needed).

  const running = ready && inView && !ecoMode;

  // ── ECO MODE ──────────────────────────────────────────────────────────────

  if (ecoMode) {
    return (
      <section
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full py-10 sm:py-12 border-y border-slate-200 dark:border-white/5"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              {t("marquee.title")}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t("marquee.ecoLabel")}
            </p>
          </div>
          {reviews.length > 0
            ? <EcoReviewGrid reviews={reviews} />
            : (
              <p className="text-center text-sm text-muted-foreground">
                {t("marquee.noReviews")}
              </p>
            )
          }
          <EcoStatsGrid statTitles={statTitles} />
          <EcoToolsGrid />
        </div>
      </section>
    );
  }

  // ── ANIMATED MARQUEES ──────────────────────────────────────────────────────

  return (
    <section
      ref={sectionRef}
      dir={isRTL ? "rtl" : "ltr"}
      className="w-full py-10 sm:py-12 overflow-hidden border-y border-slate-200 dark:border-white/5 relative"
    >
      {/*
        Dynamic keyframe injection.
        ─ LTR (en / es): marquee-ltr-scroll  →  from 0%   to -50%  (sweeps left)
        ─ RTL (ar):      marquee-rtl-scroll  →  from -50% to 0%    (sweeps right)
        Re-injects on locale change so the browser picks up the new direction
        without a page reload. A uniquely-named keyframe forces animation restart.
      */}
      <style>{kfCSS}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center px-2 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          {t("marquee.title")}
        </h3>
      </div>

      {/* ── Row 1 — Reviews ────────────────────────────────────────────────── */}
      {dupReviews.length > 0 ? (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow
            duration={25}
            running={running}
            animName={kfName}
            initialX={initialX}
          >
            {dupReviews.map((r, i) => (
              <ReviewCard key={`rev-${r.id}-${i}`} review={r} />
            ))}
          </MarqueeRow>
        </div>
      ) : (
        <div className="mb-6 sm:mb-8 text-center text-sm text-muted-foreground">
          {t("marquee.noReviews")}
        </div>
      )}

      {/* ── Row 2 — Stats ──────────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow
          duration={28}
          running={running}
          animName={kfName}
          initialX={initialX}
        >
          {dupStats.map((s, i) => (
            <StatCard
              key={`stat-${s.id}-${i}`}
              stat={s}
              title={statTitles[s.icon] ?? s.title}
            />
          ))}
        </MarqueeRow>
      </div>

      {/*
        ── Row 3 — Tools ──────────────────────────────────────────────────────
        Uses DUP_TOOLS (TOOL_FILL = 16 copies × 3 items = 48 cards).
        Total track width ≈ 48 × 184 px = 8 832 px.
        -50% = -4 416 px → seamless loop at any viewport up to 4 K.
        Same kfName / initialX as rows 1 and 2 → identical locale-aware
        direction. This is the explicit fix for the Row 3 "static" bug.
      */}
      <MarqueeRow
        duration={22}
        running={running}
        animName={kfName}
        initialX={initialX}
      >
        {DUP_TOOLS.map((tool, i) => (
          <ToolCard
            key={`tool-${tool.id}-copy${tool._copyIdx}-${i}`}
            tool={tool}
          />
        ))}
      </MarqueeRow>
    </section>
  );
}
