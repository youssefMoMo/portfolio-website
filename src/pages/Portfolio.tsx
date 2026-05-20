// src/pages/Portfolio.tsx — Professional Roblox UI/UX Portfolio showcase
// Phase 2: Category filter bar + enhanced fullscreen lightbox with design details
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, MessageSquare, X, ChevronLeft, ChevronRight,
  ImageOff, Maximize2, Tag, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PortfolioContent, PortfolioItem } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { openDiscord } from "@/lib/discord";

// ─────────────────────────────────────────
// Category configuration for Roblox UI/UX
// ─────────────────────────────────────────
const CATEGORIES = [
  { key: "All",        label: "All Work",     color: "from-primary to-indigo-500" },
  { key: "UI Design",  label: "UI Design",    color: "from-violet-500 to-purple-600" },
  { key: "Game UI",    label: "Game UI",      color: "from-cyan-500 to-blue-600" },
  { key: "HUD",        label: "HUD",          color: "from-green-500 to-emerald-600" },
  { key: "Mobile UI",  label: "Mobile UI",    color: "from-orange-500 to-amber-600" },
  { key: "Web UI",     label: "Web UI",       color: "from-rose-500 to-pink-600" },
];



// ─────────────────────────────────────────
// Safe image component
// ─────────────────────────────────────────
function PortfolioImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);
  useEffect(() => { setFailed(false); tried.current = false; }, [src]);
  if (failed) return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <ImageOff className="w-10 h-10 text-white/20" />
    </div>
  );
  return (
    <img src={src || "/images/global/fallback.png"} alt={alt} className={className}
      loading="lazy" decoding="async"
      onError={e => {
        const el = e.currentTarget;
        if (!tried.current && el.src !== "/images/global/fallback.png") {
          tried.current = true; el.src = "/images/global/fallback.png";
        } else { setFailed(true); }
      }} />
  );
}

// ─────────────────────────────────────────
// Lightbox image with slide transition
// ─────────────────────────────────────────
function LightboxImage({ src, slideDir, itemKey }: { src: string; slideDir: number; itemKey: string | number }) {
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);
  useEffect(() => { setFailed(false); tried.current = false; }, [src]);
  if (failed) return (
    <div className="flex items-center justify-center w-full h-64 bg-white/5 rounded-xl">
      <ImageOff className="w-16 h-16 text-white/20" />
    </div>
  );
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.img key={itemKey}
        initial={{ x: slideDir * 120, opacity: 0, scale: 0.97 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: slideDir * -120, opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        src={src || "/images/global/fallback.png"} alt=""
        className="w-full h-full object-contain"
        style={{ maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
        onError={e => {
          const el = e.currentTarget;
          if (!tried.current && el.src !== "/images/global/fallback.png") {
            tried.current = true; el.src = "/images/global/fallback.png";
          } else { setFailed(true); }
        }} />
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// Enhanced Lightbox with design info panel
// ─────────────────────────────────────────
function Lightbox({
  item, items, onClose, onNav,
}: {
  item: PortfolioItem; items: PortfolioItem[];
  onClose: () => void; onNav: (dir: -1 | 1) => void;
}) {
  const idx = items.findIndex(i => i.id === item.id);
  const [slideDir, setSlideDir] = useState(0);
  const [currentId, setCurrentId] = useState(item.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && idx < items.length - 1) { setSlideDir(1); onNav(1); }
      if (e.key === "ArrowLeft" && idx > 0) { setSlideDir(-1); onNav(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, items.length, onClose, onNav]);

  useEffect(() => { setCurrentId(item.id); }, [item.id]);

  const go = (dir: -1 | 1) => { setSlideDir(dir); onNav(dir); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* ── Screen-edge navigation arrows ── */}
      {idx > 0 && (
        <motion.button
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={e => { e.stopPropagation(); go(-1); }}
          className="fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-[10001] w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors shadow-2xl backdrop-blur-sm"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
      )}
      {idx < items.length - 1 && (
        <motion.button
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={e => { e.stopPropagation(); go(1); }}
          className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[10001] w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-colors shadow-2xl backdrop-blur-sm"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      )}

      {/* Close */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center border border-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </motion.button>

      {/* Main content panel */}
      <motion.div
        initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }} transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-5xl flex flex-col lg:flex-row gap-0 bg-[#0e0e14]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* ── Image pane ── */}
        <div className="relative flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-white/[0.02] to-transparent min-h-[300px]">
          <LightboxImage src={item.image || ""} slideDir={slideDir} itemKey={currentId} />

          {/* Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/60 text-xs">
            {idx + 1} / {items.length}
          </div>
        </div>

        {/* ── Info pane ── */}
        <div className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-6 flex flex-col gap-5 bg-black/30">
          {/* Title + category */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {item.category || "Design"}
              </span>
            </div>
            <h2 className="text-xl font-bold font-display leading-snug">
              {item.title || "Untitled Design"}
            </h2>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t: string) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open full size */}
          {item.image && (
            <a href={item.image} target="_blank" rel="noopener noreferrer"
              className="mt-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View full resolution
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Category filter bar
// ─────────────────────────────────────────
function FilterBar({
  active, onChange, counts,
}: { active: string; onChange: (k: string) => void; counts: Record<string, number> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="flex flex-wrap justify-center gap-2 mb-10"
    >
      {CATEGORIES.filter(c => c.key === "All" || (counts[c.key] ?? 0) > 0).map(cat => {
        const isActive = active === cat.key;
        const count = cat.key === "All" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[cat.key] ?? 0);
        return (
          <motion.button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className={`relative px-4 py-2 rounded-full text-sm font-medium border transition-all duration-250 ${
              isActive
                ? `bg-gradient-to-r ${cat.color} border-transparent text-white shadow-lg`
                : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-muted-foreground hover:border-slate-400 dark:hover:border-white/25 hover:text-slate-900 dark:hover:text-foreground bg-white dark:bg-card/30 shadow-sm dark:shadow-none"
            }`}
          >
            {cat.label}
            <span className={`ml-1.5 text-[10px] font-bold ${isActive ? "text-white/80" : "text-slate-400 dark:text-muted-foreground"}`}>
              {count}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Portfolio grid card
// ─────────────────────────────────────────
function PortfolioCard({
  item, index, onClick,
}: { item: PortfolioItem; index: number; onClick: () => void }) {
  return (
    <motion.div
      layout
      key={item.id}
      initial={{ opacity: 0, scale: 0.88, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 10 }}
      transition={{ delay: index * 0.045, duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-2xl bg-card/40 border border-white/5 hover:border-primary/30 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/8"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Category badge */}
      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/80 border border-white/20">
          {item.category}
        </span>
      </div>

      {/* Expand icon */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Maximize2 className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="aspect-video overflow-hidden">
        <PortfolioImage
          src={item.image} alt={item.title}
          className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
        <h3 className="text-white font-bold text-base leading-tight">{item.title}</h3>
        <p className="text-white/60 text-xs mt-0.5">{item.category}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Main page
// ─────────────────────────────────────────
export default function Portfolio() {
  const { t } = useLanguage();
  const [content, setContent]       = useState<PortfolioContent | null>(null);
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getContent("portfolio");
        if (mountedRef.current) setContent(data);
      } catch { /* empty state */ }
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

  // Scroll lock when lightbox open
  useEffect(() => {
    if (!selectedId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selectedId]);

  const allItems = useMemo(
    () => content?.items?.filter(i => i.is_published !== false) ?? [],
    [content],
  );

  const categoryCount = useMemo(() => {
    const map: Record<string, number> = {};
    allItems.forEach(i => { map[i.category] = (map[i.category] ?? 0) + 1; });
    return map;
  }, [allItems]);

  const filtered = useMemo(
    () => activeCategory === "All" ? allItems : allItems.filter(i => i.category === activeCategory),
    [allItems, activeCategory],
  );

  const selectedItem = selectedId != null ? allItems.find(i => i.id === selectedId) ?? null : null;
  const selectedIndex = selectedItem ? filtered.indexOf(selectedItem) : -1;

  const navigate = useCallback((dir: -1 | 1) => {
    const ni = selectedIndex + dir;
    if (ni >= 0 && ni < filtered.length) setSelectedId(filtered[ni].id);
  }, [selectedIndex, filtered]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
            <ImageIcon className="w-4 h-4" /> {t("portfolio.badge")}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-4 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {t("portfolio.title")}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base">
            {t("portfolio.subtitle")}
          </motion.p>
        </div>

        {/* ── Category filter ── */}
        {allItems.length > 0 && (
          <FilterBar active={activeCategory} onChange={cat => { setActiveCategory(cat); setSelectedId(null); }} counts={categoryCount} />
        )}

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground mb-2">No {activeCategory !== "All" ? activeCategory : ""} projects yet</p>
            {activeCategory !== "All" && (
              <Button size="sm" variant="outline" onClick={() => setActiveCategory("All")}>Show all work</Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => (
                <PortfolioCard key={item.id} item={item} index={i} onClick={() => setSelectedId(item.id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Lightbox portal ── */}
        {typeof document !== "undefined" && createPortal(
          <AnimatePresence>
            {selectedItem && (
              <Lightbox
                item={selectedItem}
                items={filtered}
                onClose={() => setSelectedId(null)}
                onNav={navigate}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-20 bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 sm:p-14 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5 border border-primary/20">
            <MessageSquare className="w-3.5 h-3.5" /> Let's collaborate
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">{t("portfolio.cta")}</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{t("portfolio.ctaText")}</p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow" onClick={openDiscord}>
              <MessageSquare className="w-5 h-5" /> {t("portfolio.discuss")}
            </Button>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
