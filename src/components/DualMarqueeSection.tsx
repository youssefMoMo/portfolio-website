// src/components/DualMarqueeSection.tsx
//
// ─── ARCHITECTURE NOTES ─────────────────────────────────────────────────────
//
//  ROOT-CAUSE FIX (Row 3 offset on cold load)
//    marquee-right removed. All three rows use marquee-left:
//      from { transform: translate3d(0, 0, 0); }
//      to   { transform: translate3d(-50%, 0, 0); }
//    Every row starts flush at 0-offset with no cold-paint shift.
//
//  RTL LAYOUT GUARD
//    The outer <section> inherits the document RTL direction for text nodes
//    (so Arabic stat titles and tool names read correctly). However the
//    inner scrolling track wrappers carry an explicit dir="ltr" override.
//    This is mandatory: CSS marquee-left keyframes operate on a left-anchored
//    Cartesian axis; flipping to RTL would reverse the perceived scroll
//    direction and misalign the edge-fade mask gradients.
//    Text elements *inside* each card read from the inherited document
//    direction, so Arabic text renders correctly without tearing the flow.
//
//  STAT CARD TITLES
//    Stat titles are no longer read from the hardcoded English `statsData`
//    array. Instead they are resolved via t("stat.<icon>") so they switch
//    instantly on language change without re-fetching any data.
//
//  i18n
//    useLanguage() injected. Section header and eco-mode label are fully
//    localised via the centralized t() function.

import { useEffect, useState, useRef } from "react";
import {
  Star, CheckCircle, Briefcase, Users, Clock,
  Zap, Gamepad, RefreshCw, Repeat,
} from "lucide-react";
import { statsData, type Stat } from "@/lib/data";
import { getAllReviews, type Review } from "@/lib/contentManager.ts";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";
import { useLanguage } from "@/hooks/use-language";

// ─── Embedded keyframes ───────────────────────────────────────────────────────
// Single keyframe for ALL three rows. Starting position is translate3d(0,0,0)
// — identical to the initial inline transform — so the browser applies
// the same position whether the animation is paused or running.
// marquee-right does not exist in this file.

const KEYFRAMES = `
@keyframes marquee-left {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolDef {
  id: number;
  name: string;
  logo: string;
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

// ─── Edge-fade mask (alpha-only, theme-agnostic) ──────────────────────────────

const EDGE_MASK =
  "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)";

// ─── MarqueeRow ───────────────────────────────────────────────────────────────
//
// NOTE: direction prop intentionally removed. All rows are marquee-left.
// The dir="ltr" on the track wrapper is a layout guard — it must NOT be
// removed or the keyframe scroll direction will reverse in RTL documents.

interface MarqueeRowProps {
  duration: number;
  running: boolean;
  children: React.ReactNode;
}

function MarqueeRow({ duration, running, children }: MarqueeRowProps) {
  return (
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          animation: `marquee-left ${duration}s linear infinite`,
          animationPlayState: running ? "running" : "paused",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps { src?: string; name: string }

function Avatar({ src, name }: AvatarProps) {
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
}

// ─── Card components ──────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 bg-white/80 dark:bg-card/70 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[280px] sm:w-[310px] hover:border-primary/30 hover:bg-white/95 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
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
}

function StatCard({ stat, title }: { stat: Stat; title: string }) {
  const Icon = STATS_ICONS[stat.icon] ?? Briefcase;
  return (
    <div className="flex-shrink-0 bg-white/80 dark:bg-card/70 border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-[200px] sm:w-[230px] hover:border-primary/40 hover:bg-white/95 dark:hover:bg-card/85 transition-colors cursor-default shadow-sm dark:shadow-none">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent mb-1">
        {stat.value}
      </div>
      {/* Title resolved via t() so it switches on language change */}
      <p className="text-[11px] sm:text-xs text-muted-foreground">{title}</p>
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolDef }) {
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
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-2xl select-none" aria-hidden="true">
            {tool.emoji}
          </span>
        )}
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
      {slice.map((r) => <ReviewCard key={r.id} review={r} />)}
    </div>
  );
}

function EcoStatsGrid({ statTitles }: { statTitles: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsData.map((s) => (
        <StatCard key={s.id} stat={s} title={statTitles[s.icon] ?? s.title} />
      ))}
    </div>
  );
}

function EcoToolsGrid() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {TOOLS.map((t) => <ToolCard key={t.id} tool={t} />)}
    </div>
  );
}

// ─── DualMarqueeSection ───────────────────────────────────────────────────────

export function DualMarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { t, isRTL } = useLanguage();

  // Build a lookup table: icon slug → localized title
  // Recalculated on every render so it always reflects the current language.
  const statTitles: Record<string, string> = {
    briefcase: t("stat.briefcase"),
    users:     t("stat.users"),
    clock:     t("stat.clock"),
    star:      t("stat.star"),
    gamepad:   t("stat.gamepad"),
    zap:       t("stat.zap"),
    refresh:   t("stat.refresh"),
    repeat:    t("stat.repeat"),
  };

  const [ecoMode, setEcoMode] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready,   setReady]   = useState(false);
  const [inView,  setInView]  = useState(true);

  useEffect(() => {
    try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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

  useEffect(() => {
    const sync = () => {
      try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

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

  const dupReviews = reviews.length > 0 ? [...reviews, ...reviews] : [];
  const dupStats   = [...statsData, ...statsData];
  const dupTools   = [...TOOLS, ...TOOLS];

  const running = ready && inView && !ecoMode;

  // ─── ECO MODE — static fallback grid ─────────────────────────────────────

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

  // ─── ANIMATED MARQUEES ────────────────────────────────────────────────────

  return (
    <section
      ref={sectionRef}
      dir={isRTL ? "rtl" : "ltr"}
      className="w-full py-10 sm:py-12 overflow-hidden border-y border-slate-200 dark:border-white/5 relative"
    >
      {/*
        Single keyframe block. Only marquee-left is defined here.
        marquee-right does not exist — its absence is a structural
        guarantee that Row 3 can never revert to the offset-initialised
        behaviour that caused the mid-viewport start artefact.
      */}
      <style>{KEYFRAMES}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center px-2 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          {t("marquee.title")}
        </h3>
      </div>

      {/* Row 1 — Reviews (left, 25 s) */}
      {dupReviews.length > 0 ? (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow duration={25} running={running}>
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

      {/* Row 2 — Stats (left, 25 s) */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow duration={25} running={running}>
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
        Row 3 — Tools (left, 25 s)
        All three rows are now structurally identical at the keyframe level.
        dir="ltr" is applied inside MarqueeRow's track wrapper — the RTL
        layout guard that keeps the CSS animation axis stable.
      */}
      <MarqueeRow duration={25} running={running}>
        {dupTools.map((tool, i) => (
          <ToolCard key={`tool-${tool.id}-${i}`} tool={tool} />
        ))}
      </MarqueeRow>
    </section>
  );
}
