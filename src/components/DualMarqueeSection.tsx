// src/components/DualMarqueeSection.tsx
//
// ─── FIX CHANGELOG ───────────────────────────────────────────────────────────
//
// BUG 1 — Marquee RTL inversion:
//   For LTR locales (en, es): track initialises at translate3d(0,0,0) and
//   scrolls left to translate3d(-50%,0,0). For Arabic (ar): track initialises
//   at translate3d(-50%,0,0) and scrolls right to translate3d(0,0,0).
//   Keyframe name is dynamically computed from the current language so the
//   browser always picks up the correct @keyframes block.
//
// BUG 2 — Mid-screen cold-load offset:
//   Initial inline transform on the track wrapper always matches the keyframe
//   `from` value, so the first painted frame is identical to the animation
//   start — zero layout jump on cold load.
//
// BUG 3 — Static track (tools not scrolling):
//   All three rows share the same keyframe name (computed from lang), so RTL
//   inversion applies uniformly. The animation-name is injected as a <style>
//   block that re-renders when lang changes.

import { useEffect, useState, useRef, useMemo } from "react";
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

// ─── Dynamic keyframe builder ─────────────────────────────────────────────────
//
// RTL (Arabic): track starts at -50% (left edge) and crawls right to 0%.
//   This is the visual inverse of the LTR flow and feels natural for RTL readers.
// LTR (English, Spanish): track starts at 0% and crawls left to -50%.
//
// The keyframe name encodes the direction so switching language causes a
// fresh @keyframes injection — browsers re-apply the animation immediately.

function buildKeyframes(isRTL: boolean): { css: string; name: string } {
  const name = isRTL ? "marquee-rtl-scroll" : "marquee-ltr-scroll";
  const css = isRTL
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
  duration:    number;
  running:     boolean;
  animName:    string;   // computed from buildKeyframes()
  initialX:    string;   // matches keyframe `from` → zero cold-load jump
  children:    React.ReactNode;
}

function MarqueeRow({ duration, running, animName, initialX, children }: MarqueeRowProps) {
  return (
    // dir="ltr" keeps the CSS axis left-anchored. RTL inversion is done
    // entirely in the keyframe (translate direction), not the layout axis.
    <div
      className="relative w-full overflow-hidden"
      dir="ltr"
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      <div
        className="flex gap-4 sm:gap-6 w-max"
        style={{
          // Initial transform MUST match the keyframe `from` value.
          // This eliminates the cold-paint jump where the browser would
          // render the element at its CSS default (0,0) before the
          // animation's first frame fires.
          transform:          initialX === "0%" ? "translate3d(0,0,0)" : "translate3d(-50%,0,0)",
          animation:          `${animName} ${duration}s linear infinite`,
          animationPlayState: running ? "running" : "paused",
          willChange:         "transform",
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
      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-muted-foreground">{title}</p>
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
      <p className="text-[11px] sm:text-xs font-medium text-slate-800 dark:text-foreground text-center">
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
  const { t, isRTL, lang } = useLanguage();

  // Build localized stat title lookup — updates instantly on language change
  const statTitles: Record<string, string> = useMemo(() => ({
    briefcase: t("stat.briefcase"),
    users:     t("stat.users"),
    clock:     t("stat.clock"),
    star:      t("stat.star"),
    gamepad:   t("stat.gamepad"),
    zap:       t("stat.zap"),
    refresh:   t("stat.refresh"),
    repeat:    t("stat.repeat"),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang]);

  // Compute keyframe CSS + name based on current locale
  const { css: kfCSS, name: kfName } = useMemo(
    () => buildKeyframes(isRTL),
    [isRTL],
  );

  // initialX = keyframe `from` value — keeps cold-paint position identical
  // to frame 0 of the animation so there's zero layout jump.
  const initialX = isRTL ? "-50%" : "0%";

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
        Dynamic keyframe injection.
        - LTR (en/es): marquee-ltr-scroll → from 0% to -50%  (scrolls left)
        - RTL (ar):    marquee-rtl-scroll → from -50% to 0%  (scrolls right)
        Re-injects whenever lang changes so the browser picks up the
        correct direction without a page reload.
      */}
      <style>{kfCSS}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 sm:mb-10 relative z-10">
        <h3 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-center px-2 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          {t("marquee.title")}
        </h3>
      </div>

      {/* Row 1 — Reviews */}
      {dupReviews.length > 0 ? (
        <div className="mb-6 sm:mb-8">
          <MarqueeRow duration={25} running={running} animName={kfName} initialX={initialX}>
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

      {/* Row 2 — Stats */}
      <div className="mb-6 sm:mb-8">
        <MarqueeRow duration={28} running={running} animName={kfName} initialX={initialX}>
          {dupStats.map((s, i) => (
            <StatCard
              key={`stat-${s.id}-${i}`}
              stat={s}
              title={statTitles[s.icon] ?? s.title}
            />
          ))}
        </MarqueeRow>
      </div>

      {/* Row 3 — Tools */}
      <MarqueeRow duration={22} running={running} animName={kfName} initialX={initialX}>
        {dupTools.map((tool, i) => (
          <ToolCard key={`tool-${tool.id}-${i}`} tool={tool} />
        ))}
      </MarqueeRow>
    </section>
  );
}
