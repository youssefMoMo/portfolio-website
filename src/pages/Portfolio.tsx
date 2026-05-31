// src/pages/Portfolio.tsx — Framer Motion Directional Lightbox Carousel Upgrade
//
// ANIMATION MANDATE (100% Framer Motion — zero CSS transitions):
//  • Lightbox: AnimatePresence scale-up + fade-in overlay entry
//  • Carousel: [page, direction] state drives directional slide variants
//    - Next  (dir=+1): current exits LEFT, incoming enters from RIGHT
//    - Prev  (dir=-1): current exits RIGHT, incoming enters from LEFT
//  • Nav arrows: spring-physics whileHover / whileTap
//  • PortfolioCard grid: staggered entrance via custom={index} + spring variants
//  • Shimmer beam: motion.div sweep across card border on hover

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Image as ImageIcon, MessageSquare, X, ChevronLeft, ChevronRight,
  ImageOff, Maximize2, Tag, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PortfolioContent, PortfolioItem } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { openDiscord } from "@/lib/discord";

// ─── Spring configs ────────────────────────────────────────────────────────────

const SPRING_SNAPPY  = { type: "spring", stiffness: 400, damping: 30 } as const;
const SPRING_SOFT    = { type: "spring", stiffness: 260, damping: 28 } as const;
const SPRING_OVERLAY = { type: "spring", stiffness: 320, damping: 32 } as const;

// ─── Directional slide variants ────────────────────────────────────────────────
// direction > 0 → moving forward (right arrow pressed):
//   incoming slides in from RIGHT (+x), outgoing exits to LEFT (-x)
// direction < 0 → moving backward (left arrow pressed):
//   incoming slides in from LEFT (-x), outgoing exits to RIGHT (+x)

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.94,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: SPRING_SOFT,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.94,
    filter: "blur(6px)",
    transition: { ...SPRING_SOFT, duration: 0.22 },
  }),
};

// ─── Card entrance variants (staggered by index) ───────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 },
  }),
  exit: { opacity: 0, scale: 0.88, y: 10, transition: { duration: 0.2 } },
};

// ─── PortfolioImage ────────────────────────────────────────────────────────────

function PortfolioImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    setFailed(false);
    tried.current = false;
  }, [src]);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5">
        <ImageOff className="w-10 h-10 text-slate-400 dark:text-white/20" />
      </div>
    );
  }

  return (
    <img
      src={src || "/images/global/fallback.png"}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (!tried.current && el.src !== window.location.origin + "/images/global/fallback.png") {
          tried.current = true;
          el.src = "/images/global/fallback.png";
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

// ─── Shimmer beam (sweeps across card border on hover) ────────────────────────

function ShimmerBeam() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-20"
      initial="rest"
      whileHover="hover"
    >
      <motion.div
        variants={{
          rest: { x: "-120%", opacity: 0 },
          hover: {
            x: "220%",
            opacity: [0, 0.55, 0.55, 0],
            transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
          },
        }}
        className="absolute inset-y-0 w-1/3"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0.18) 60%, transparent 100%)",
          mixBlendMode: "overlay",
        }}
      />
    </motion.div>
  );
}

// ─── PortfolioCard ─────────────────────────────────────────────────────────────

function PortfolioCard({
  item,
  index,
  onClick,
}: {
  item: PortfolioItem;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      key={item.id}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02, y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-2xl bg-background/60 backdrop-blur-md border border-white/5 hover:border-primary/35 shadow-lg"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Shimmer beam on hover */}
      <ShimmerBeam />

      {/* Expand icon */}
      <motion.div
        className="absolute top-3 right-3 z-10"
        initial={{ opacity: 0, scale: 0.7 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={SPRING_SNAPPY}
      >
        <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </div>
      </motion.div>

      <div className="aspect-video overflow-hidden">
        <motion.div
          className="w-full h-full"
          whileHover={{ scale: 1.07 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        >
          <PortfolioImage
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>

      {/* Vignette */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

// ─── LightboxImage — directional slide ────────────────────────────────────────

function LightboxImage({
  src,
  direction,
  itemKey,
}: {
  src: string;
  direction: number;
  itemKey: string | number;
}) {
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    setFailed(false);
    tried.current = false;
  }, [src]);

  if (failed) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-white/5 rounded-xl">
        <ImageOff className="w-16 h-16 text-white/20" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.img
        key={itemKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        src={src || "/images/global/fallback.png"}
        alt=""
        className="w-full h-full object-contain"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const el = e.currentTarget;
          if (!tried.current && el.src !== window.location.origin + "/images/global/fallback.png") {
            tried.current = true;
            el.src = "/images/global/fallback.png";
          } else {
            setFailed(true);
          }
        }}
      />
    </AnimatePresence>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  item,
  items,
  onClose,
}: {
  item: PortfolioItem;
  items: PortfolioItem[];
  onClose: () => void;
}) {
  // [page, direction]: page = index, direction = +1 (forward) or -1 (back)
  const [pageState, setPageState] = useState<[number, number]>([
    items.findIndex((i) => i.id === item.id),
    0,
  ]);
  const [page, direction] = pageState;
  const currentItem = items[page] ?? item;

  const go = useCallback(
    (dir: -1 | 1) => {
      setPageState(([p]) => {
        const next = p + dir;
        if (next < 0 || next >= items.length) return [p, 0];
        return [next, dir];
      });
    },
    [items.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, go]);

  const canPrev = page > 0;
  const canNext = page < items.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[9999] bg-black/96 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Directional nav — LEFT (previous) */}
      <AnimatePresence>
        {canPrev && (
          <motion.button
            key="prev"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0, transition: SPRING_SNAPPY }}
            exit={{ opacity: 0, x: -28 }}
            whileHover={{ scale: 1.12, x: -4 }}
            whileTap={{ scale: 0.92 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-[10001] w-12 h-12 rounded-full bg-white/10 hover:bg-white/22 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Directional nav — RIGHT (next) */}
      <AnimatePresence>
        {canNext && (
          <motion.button
            key="next"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0, transition: SPRING_SNAPPY }}
            exit={{ opacity: 0, x: 28 }}
            whileHover={{ scale: 1.12, x: 4 }}
            whileTap={{ scale: 0.92 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[10001] w-12 h-12 rounded-full bg-white/10 hover:bg-white/22 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Close */}
      <motion.button
        initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ ...SPRING_SNAPPY, delay: 0.1 }}
        whileHover={{ scale: 1.12, rotate: 90, backgroundColor: "rgba(239,68,68,0.8)" }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-[10002] w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20"
      >
        <X className="w-5 h-5" />
      </motion.button>

      {/* Panel — scale-up + fade-in entry */}
      <motion.div
        initial={{ scale: 0.92, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 28, opacity: 0 }}
        transition={SPRING_OVERLAY}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl flex flex-col lg:flex-row gap-0 bg-[#0e0e14]/96 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Image pane */}
        <div className="relative flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-white/[0.02] to-transparent min-h-[300px] overflow-hidden">
          <LightboxImage
            src={currentItem.image || ""}
            direction={direction}
            itemKey={page}
          />

          {/* Counter pill */}
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SNAPPY}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/60 text-xs tabular-nums"
          >
            {page + 1} / {items.length}
          </motion.div>
        </div>

        {/* Info pane — slides in with content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={SPRING_SOFT}
            className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-6 flex flex-col gap-5 bg-black/30"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {currentItem.category || "Design"}
                </span>
              </div>
              <h2 className="text-xl font-bold font-display leading-snug text-white">
                {currentItem.title || "Untitled Design"}
              </h2>
              {currentItem.description && (
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {currentItem.description}
                </p>
              )}
            </div>

            {currentItem.tags && currentItem.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentItem.tags.map((tag: string) => (
                    <motion.span
                      key={tag}
                      whileHover={{ scale: 1.06 }}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-xs text-white/50 cursor-default"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {currentItem.link && (
              <motion.a
                href={currentItem.link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04, x: 3 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                className="flex items-center gap-2 text-xs text-primary hover:text-primary/80"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Project
              </motion.a>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { t } = useLanguage();
  const [content, setContent]       = useState<PortfolioContent | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const mountedRef                  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  useEffect(() => {
    if (!selectedId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selectedId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getContent("portfolio");
        if (mountedRef.current) setContent(data);
      } catch {}
      finally { if (mountedRef.current) setLoading(false); }
    })();
  }, []);

  useContentRealtime("portfolio", async () => {
    if (!mountedRef.current) return;
    try {
      const data = await getContent("portfolio");
      if (mountedRef.current) setContent(data);
    } catch {}
  });

  const allItems = useMemo(
    () => content?.items?.filter((i) => i.is_published !== false) ?? [],
    [content],
  );

  const selectedItem = selectedId != null ? allItems.find((i) => i.id === selectedId) ?? null : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SOFT}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20"
          >
            <ImageIcon className="w-4 h-4" /> {t("portfolio.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SOFT, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-4 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent text-balance"
          >
            {t("portfolio.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SOFT, delay: 0.18 }}
            className="text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto text-base text-balance"
          >
            {t("portfolio.subtitle")}
          </motion.p>
        </div>

        {/* Grid */}
        {allItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <ImageIcon className="w-16 h-16 text-slate-400 dark:text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-slate-600 dark:text-muted-foreground mb-2">
              No portfolio items yet
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {allItems.map((item, i) => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  index={i}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Lightbox portal */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {selectedItem && (
                <Lightbox
                  item={selectedItem}
                  items={allItems}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </AnimatePresence>,
            document.body,
          )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={SPRING_SOFT}
          className="mt-20 bg-background/60 backdrop-blur-xl border border-white/5 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
        >
          <ShimmerBeam />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5 border border-primary/20">
            <MessageSquare className="w-3.5 h-3.5" /> {t("portfolio.collab")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 text-slate-900 dark:text-zinc-100 text-balance">
            {t("portfolio.cta")}
          </h2>
          <p className="text-slate-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto text-balance">
            {t("portfolio.ctaText")}
          </p>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
          >
            <Button
              size="lg"
              className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
              onClick={openDiscord}
            >
              <MessageSquare className="w-5 h-5" /> {t("portfolio.discuss")}
            </Button>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
