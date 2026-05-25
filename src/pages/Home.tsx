// src/pages/Home.tsx
// REFACTOR CHANGELOG:
//   • IMAGE STATE DRIFT FIX: HomeImage now tracks src via a dedicated useEffect.
//     Whenever src changes (e.g. Supabase dynamic update), failed and triedFallback are
//     forcibly reset so the component never freezes on a stale fallback block.
//   • REEL RECONCILIATION: getWeeklyRandomItems is fully documented; the rolling weekly
//     seed calculation uses a stable integer seed derived from ISO week number so the
//     selection is consistent for all users within the same calendar week.
//   • LAYOUT FLASHING FIX: portfolioDuration initial state is PORTFOLIO_MIN_DUR (30 s)
//     instead of 0. This prevents a 0-duration flash before the double-RAF measurement
//     fires. The reel animates at a safe default speed from the first frame, then
//     smoothly transitions to the exact measured speed once bounding-box data is ready.
//
// ─── CLS FIX (2026-05) ──────────────────────────────────────────────────────
//   ROOT CAUSE A — Frozen "Featured Designs" carousel:
//     @keyframes marquee-scroll-left was removed from index.css (the file's
//     own comment at line 960 confirms the deletion). The track element
//     referenced `animation: marquee-scroll-left Xs linear infinite`, which
//     the browser resolved to an unknown keyframe name — producing a static,
//     unmoving element. The keyframe is now injected as a self-contained
//     <style> block inside this component (same pattern DualMarqueeSection
//     uses for marquee-left / marquee-right), so the carousel is fully
//     independent of index.css and can never be broken by future CSS purges.
//
//   ROOT CAUSE B — Hero async text CLS:
//     When homeContent is null (first render), the hero badge, title1, and
//     title2 all render via t() fallbacks. When the async Supabase fetch
//     resolves with content whose text differs in length from the t() values,
//     the badge and h1 reflow — shifting all downstream sections downward.
//     Fix: every dynamic hero text node now lives inside a container that
//     carries an explicit min-h. This pre-reserves the vertical slot so
//     content arrival never expands the layout box.

import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Briefcase, Users, Clock, Star, Gamepad2, Zap, RefreshCcw, Repeat,
  ArrowRight, MessageSquare, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, HomeContent } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { profile, statsData } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";
import { DualMarqueeSection } from "@/components/DualMarqueeSection";

// ── Inline keyframes ───────────────────────────────────────────────────────────
//
// @keyframes marquee-scroll-left was intentionally removed from index.css.
// Embedding it here makes the Featured Designs carousel fully self-contained
// and immune to any future stylesheet purge or keyframe-name collision.
//
// Technique: translate exactly -50% of the track element's total width.
// Because the track contains 2× item duplication, -50% == one set's width,
// producing a perfectly seamless loop with zero jump at the boundary.

const PORTFOLIO_KEYFRAMES = `
@keyframes marquee-scroll-left {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

// ── Static portfolio image manifest ───────────────────────────────────────────
const ALL_PORTFOLIO_IMAGES = Array.from({ length: 22 }, (_, i) => ({
  id:       i + 1,
  title:    `Design ${i + 1}`,
  image:    `/images/portfolio/work${i + 1}.png`,
  category: "UI Design",
}));

// ── getWeeklyRandomItems ───────────────────────────────────────────────────────
//
// Returns `count` portfolio items chosen pseudo-randomly but stably for the
// current ISO calendar week. The same set is shown to every visitor during the
// same week, producing a predictable "featured this week" feel without any
// server state.
//
// Algorithm:
//   1. Derive an integer weekNumber from the millisecond offset of midnight
//      Jan 1 of the current year. (Approximation — accurate enough for UI
//      purposes; not ISO 8601 strict, but consistent across all clients.)
//   2. Multiply by a large prime to generate a deterministic per-week seed.
//   3. Use the seed in a linear-congruential-style hash per item ID to produce
//      a sort key, then slice the first `count` elements from the sorted array.
//
// Note: The hash function intentionally avoids JS's floating-point modulo
// precision ceiling by keeping operands within the safe integer range
// (seed * id * 1234567 stays < Number.MAX_SAFE_INTEGER for id ≤ 22 and
// seed values produced here).
//
function getWeeklyRandomItems(count: number) {
  const now        = new Date();
  const yearStart  = new Date(now.getFullYear(), 0, 1).getTime();
  const weekNumber = Math.floor((now.getTime() - yearStart) / (7 * 24 * 60 * 60 * 1000));

  // Large-prime multiplication keeps the seed far from sequential integers.
  const seed = weekNumber * 9301 + 49297;

  const shuffled = [...ALL_PORTFOLIO_IMAGES].sort((a, b) => {
    const ra = ((seed * a.id * 1_234_567) % 1_000) / 1_000;
    const rb = ((seed * b.id * 1_234_567) % 1_000) / 1_000;
    return ra - rb;
  });

  return shuffled.slice(0, count);
}

// ── Stat icon lookup ───────────────────────────────────────────────────────────
const statIcons: Record<string, React.ElementType> = {
  briefcase: Briefcase, users: Users, clock: Clock,  star: Star,
  gamepad:   Gamepad2,  zap:   Zap,   refresh: RefreshCcw, repeat: Repeat,
};

// ── Animation variant ──────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

// ── Portfolio reel speed constants ─────────────────────────────────────────────
const PORTFOLIO_PX_PER_SEC = 50;   // target linear crawl speed in px/s
const PORTFOLIO_MIN_DUR    = 30;   // minimum duration floor in seconds

// ── HomeImage — safe image with src-mutation aware state reset ─────────────────
//
// Problem solved: if `src` changes dynamically (e.g. a Supabase update pushes a
// new image URL), the component's `failed` and `triedFallback` states could remain
// true from a prior failed load, permanently rendering the fallback icon even
// though the new URL is valid.
//
// Fix: A dedicated useEffect watches `src`. On every src mutation it resets both
// states back to their initial values so the next render attempts the fresh URL.
//
function HomeImage({
  src,
  alt,
  className,
}: {
  src:        string;
  alt:        string;
  className?: string;
}) {
  const [failed, setFailed]   = useState(false);
  const triedFallback         = useRef(false);

  // Reset failure state whenever the src prop changes.
  useEffect(() => {
    setFailed(false);
    triedFallback.current = false;
  }, [src]);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5">
        <ImageOff className="w-8 h-8 text-white/20" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (!triedFallback.current) {
          triedFallback.current = true;
          el.src = "/images/global/fallback.png";
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

// ── Main page component ────────────────────────────────────────────────────────
export default function Home() {
  const { t } = useLanguage();

  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);
  const [rafReady,    setRafReady]    = useState(false);

  // Initial portfolioDuration is PORTFOLIO_MIN_DUR (not 0) so the reel starts
  // animating at a safe default speed on the very first frame, eliminating the
  // layout flash that occurred when duration was 0 and the animation was "none".
  const [portfolioDuration, setPortfolioDuration] = useState(PORTFOLIO_MIN_DUR);

  const weeklyItems      = useMemo(() => getWeeklyRandomItems(6), []);
  const mountedRef       = useRef(true);
  const rafRef           = useRef<number | null>(null);

  // Ref on the INNER scrolling track (not the overflow-hidden wrapper).
  // The measured scrollWidth / 2 gives one set's pixel width.
  const portfolioTrackRef = useRef<HTMLDivElement>(null);

  // ── Double-RAF mount guard ─────────────────────────────────────────────
  // Ensures the component has actually composited a frame before we try to
  // measure layout. Two nested rAF calls guarantee we're past the first paint.
  useEffect(() => {
    mountedRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (mountedRef.current) setRafReady(true);
      });
    });
    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Portfolio reel speed measurement ──────────────────────────────────
  // Fires once rafReady becomes true. We use a final rAF to let flex layout
  // settle before reading scrollWidth.
  // duration = (oneSetWidth px) / (PORTFOLIO_PX_PER_SEC px/s) → constant 50 px/s.
  useEffect(() => {
    if (!rafReady || !portfolioTrackRef.current) return;
    const id = requestAnimationFrame(() => {
      if (!portfolioTrackRef.current) return;
      const oneSetWidth = portfolioTrackRef.current.scrollWidth / 2;
      if (oneSetWidth > 0) {
        setPortfolioDuration(
          Math.max(oneSetWidth / PORTFOLIO_PX_PER_SEC, PORTFOLIO_MIN_DUR),
        );
      }
    });
    return () => cancelAnimationFrame(id);
  }, [rafReady]);

  // ── Data fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const home = await getContent("home");
        if (mountedRef.current && !cancelled) setHomeContent(home);
      } catch { /* keep null — UI uses t() fallbacks */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Live updates from admin saves ──────────────────────────────────────
  useContentRealtime("home", async () => {
    if (!mountedRef.current) return;
    try {
      const home = await getContent("home");
      if (mountedRef.current) setHomeContent(home);
    } catch { /* ignore */ }
  });

  const content = homeContent;

  return (
    <div className="min-h-screen">

      {/*
        ── Inline keyframe injection ──────────────────────────────────────────
        Scoped to this component's mount lifecycle. The <style> tag is injected
        once at the top of the render tree so the animation name resolves before
        the carousel track's first composited frame.
      */}
      <style>{PORTFOLIO_KEYFRAMES}</style>

      {/* ── Hero ── */}
      <section className="relative pt-8 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">

          {/*
            CLS FIX — Hero Badge
            ─────────────────────
            The badge container receives `min-h-[2.75rem]` (the rendered height
            of the pill at text-sm with py-2.5). This pre-reserves the vertical
            slot on the first paint so that when async `content?.hero_badge`
            arrives with different text, the pill width may change horizontally
            but the block height — and therefore the layout of everything below —
            never shifts.
          */}
          <div className="min-h-[2.75rem] flex items-center justify-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: [0, 5, -5, 0], rotateY: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ perspective: 800 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-sm font-semibold border border-emerald-500/25"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                {content?.hero_badge || t("hero.badge")}
              </motion.div>
            </motion.div>
          </div>

          {/*
            CLS FIX — Hero H1
            ──────────────────
            `min-h-[7.5rem]` reserves approximately two lines of text at the
            smallest viewport (text-5xl leading-tight ≈ 3.75rem/line × 2).
            On wider viewports the font is larger but the content is the same
            number of lines, so the reserved block never over-constrains.
            `layout="position"` on the Framer Motion wrapper tells the
            animation engine not to re-measure siblings when this element
            animates — preventing secondary CLS from the whileInView trigger.
          */}
          <div className="min-h-[7.5rem] flex flex-col items-center justify-center mb-6">
            <motion.h1
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold font-display leading-tight"
            >
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                {content?.hero_title1 || t("hero.title1")}
              </span>
              <br />
              <span className="text-foreground">{content?.hero_title2 || t("hero.title2")}</span>
            </motion.h1>
          </div>

          {/*
            CLS FIX — Hero Subtitle
            ────────────────────────
            `min-h-[3.5rem]` reserves two lines of text-lg body copy before
            async content arrives. The subtitle is max-w-2xl so it wraps to
            roughly two lines on mobile; that height is pre-allocated.
          */}
          <div className="min-h-[3.5rem] flex items-center justify-center mb-10">
            <motion.p
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto"
            >
              {content?.hero_subtitle || t("hero.subtitle")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/portfolio">
              <Button
                size="lg"
                className="gap-2 rounded-full px-8 h-12 text-base font-semibold bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
              >
                {t("btn.portfolio")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full px-8 h-12 text-base font-semibold border-white/10 hover:bg-white/5"
              >
                {t("btn.pricing")}
              </Button>
            </Link>
          </motion.div>

        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statsData.slice(0, 4).map((stat, i) => {
              const IconComp = statIcons[stat.icon] || Star;
              const dynamicValues: Record<number, string> = {
                1: content?.stats_projects || stat.value,
                2: content?.stats_clients  || stat.value,
                3: content?.stats_years    || stat.value,
                4: content?.stats_rating   || stat.value,
              };
              return (
                <motion.div
                  key={stat.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="group relative p-6 rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all duration-300 text-center shadow-sm dark:shadow-none"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <IconComp className="w-6 h-6 text-primary mx-auto mb-3" />
                    {/*
                      CLS FIX — Stat value
                      ─────────────────────
                      `min-h-[2.5rem]` on the value wrapper pre-allocates the
                      row height for the text-3xl figure. Since `stat.value`
                      is always present as the synchronous fallback, the text
                      is never empty; this guard is purely defensive against
                      a Supabase value that is momentarily undefined during
                      re-fetch on a live admin update.
                    */}
                    <div className="min-h-[2.5rem] flex items-center justify-center">
                      <p className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                        {dynamicValues[stat.id] || stat.value}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">{t(`stat.${stat.icon}` as import("@/lib/data").TranslationKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <DualMarqueeSection />

      {/* ── Portfolio Reel ── */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4"
            >
              {t("portfolio.title")}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-600 dark:text-zinc-400 max-w-xl mx-auto"
            >
              {t("portfolio.subtitle")}
            </motion.p>
          </div>

          {/*
            ── Slider: Featured Designs / Portfolio Reel ───────────────────
            Architecture:
              • @keyframes marquee-scroll-left injected via the <style> tag at
                the top of this component's render output. The keyframe is
                intentionally NOT in index.css (which deleted it) — embedding
                it here makes the carousel fully self-contained.
              • dir="ltr" enforces consistent scroll direction in Arabic locale.
              • 2× item duplication (minimum for a seamless -50% CSS loop).
              • portfolioDuration defaults to PORTFOLIO_MIN_DUR (30 s) so the
                reel is never momentarily frozen at "none" animation.
              • After double-RAF, measured duration = oneSetWidth / PX_PER_SEC
                guarantees a constant 50 px/s crawl on every screen width.
              • portfolioTrackRef attaches to the inner scrolling track (not
                the overflow-hidden clip wrapper) so scrollWidth is accurate.
              • pointer-events: none is intentionally NOT set on the outer
                wrapper — the hover overlay on each card must remain interactive.
          */}
          <div
            className="relative w-full overflow-hidden"
            dir="ltr"
            style={{
              direction:       "ltr",
              maskImage:       "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
            }}
          >
            <div
              ref={portfolioTrackRef}
              className="flex gap-6 w-max"
              style={{
                animation:  `marquee-scroll-left ${portfolioDuration.toFixed(3)}s linear infinite`,
                willChange: "transform",
                transform:  "translateZ(0)",
              }}
            >
              {/* 2× duplication — required for the @keyframes -50% translate */}
              {[...weeklyItems, ...weeklyItems].map((item, i) => (
                <div
                  key={`${item.id}-${i}`}
                  className="group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-card/40 border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all duration-500 w-[320px] md:w-[380px] flex-shrink-0"
                >
                  <div className="aspect-video overflow-hidden bg-card/60 relative">
                    <HomeImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-white/70 text-sm">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/portfolio">
              <Button variant="outline" className="gap-2 rounded-full px-8">
                {t("btn.portfolio")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-12 md:p-16 text-center overflow-hidden shadow-sm dark:shadow-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10" />
            <div className="relative">
              {/*
                CLS FIX — CTA title
                ────────────────────
                `min-h-[3rem]` reserves one line of text-3xl / text-4xl before
                async content arrives, preventing the CTA card from expanding
                downward when content?.cta_title loads.
              */}
              <div className="min-h-[3rem] flex items-center justify-center mb-4">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-zinc-100">
                  {content?.cta_title || t("cta.title")}
                </h2>
              </div>
              <p className="text-slate-600 dark:text-zinc-400 max-w-xl mx-auto mb-8">
                {content?.cta_subtitle || t("cta.subtitle")}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="gap-2 rounded-full px-8 bg-gradient-to-r from-primary to-indigo-500"
                  >
                    {t("cta.plan")} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
                  onClick={() => openDiscordProfile(profile.discord)}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t("cta.discord")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
