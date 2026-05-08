import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, MessageSquare, X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PortfolioContent } from "@/lib/contentManager";
import { profile } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";

// ── Safe image with infinite-loop prevention ───────────────────
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
  const triedFallback = useRef(false);

  useEffect(() => {
    setFailed(false);
    triedFallback.current = false;
  }, [src]);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5">
        <ImageOff className="w-10 h-10 text-white/20" />
      </div>
    );
  }

  return (
    <img
      src={src || "/images/fallback.png"}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget;
        if (!triedFallback.current && el.src !== "/images/fallback.png") {
          triedFallback.current = true;
          el.src = "/images/fallback.png";
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

// ── Lightbox image with motion + safe error ────────────────────
function LightboxImage({
  src,
  slideDir,
  itemKey,
}: {
  src: string;
  slideDir: number;
  itemKey: string | number;
}) {
  const [failed, setFailed] = useState(false);
  const triedFallback = useRef(false);

  useEffect(() => {
    setFailed(false);
    triedFallback.current = false;
  }, [src]);

  if (failed) {
    return (
      <div className="flex items-center justify-center w-80 h-60 bg-white/5 rounded-xl">
        <ImageOff className="w-16 h-16 text-white/20" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.img
        key={itemKey}
        initial={{ x: slideDir * 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideDir * -200, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        src={src || "/images/fallback.png"}
        alt=""
        className="max-w-full max-h-[85vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const el = e.currentTarget;
          if (!triedFallback.current && el.src !== "/images/fallback.png") {
            triedFallback.current = true;
            el.src = "/images/fallback.png";
          } else {
            setFailed(true);
          }
        }}
      />
    </AnimatePresence>
  );
}

export default function Portfolio() {
  const { t } = useLanguage();
  const [content, setContent]       = useState<PortfolioContent | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | number | null>(null);
  const [slideDir, setSlideDir]     = useState(0);
  const mountedRef = useRef(true);

  // Mounted guard
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Data load
  useEffect(() => {
    (async () => {
      try {
        const data = await getContent("portfolio");
        if (mountedRef.current) setContent(data);
      } catch { /* keep null — empty state rendered */ }
      finally { if (mountedRef.current) setLoading(false); }
    })();
  }, []);

  // Body scroll lock + ESC for lightbox
  useEffect(() => {
    if (!selectedItem) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedItem(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedItem]);

  const items = useMemo(
    () => content?.items?.filter((item) => item.is_published !== false) ?? [],
    [content],
  );

  const currentIndex = useMemo(
    () => selectedItem != null ? items.findIndex((i) => i.id === selectedItem) : -1,
    [selectedItem, items],
  );

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < items.length - 1) {
      setSlideDir(1);
      setSelectedItem(items[currentIndex + 1].id);
    }
  }, [currentIndex, items]);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setSlideDir(-1);
      setSelectedItem(items[currentIndex - 1].id);
    }
  }, [currentIndex, items]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedImg = selectedItem != null ? items.find((i) => i.id === selectedItem) : null;

  return (
    <div className="min-h-screen pt-8 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <Image className="w-4 h-4" />
            {t("portfolio.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent"
          >
            {t("portfolio.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t("portfolio.subtitle")}
          </motion.p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No projects to show yet</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  onClick={() => setSelectedItem(item.id)}
                  className="group cursor-pointer relative overflow-hidden rounded-2xl bg-card/40 border border-white/5 hover:border-primary/30 transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                  style={{ willChange: "transform, opacity" }}
                >
                  <div className="aspect-video overflow-hidden">
                    <PortfolioImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-400">
                    <h3 className="text-white font-bold text-lg">{item.title}</h3>
                    <p className="text-white/60 text-sm">{item.category}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {selectedItem != null && selectedImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setSelectedItem(null)}
            >
              {/* Close */}
              <motion.button
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.15, boxShadow: "0 0 20px rgba(239,68,68,0.5)" }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
                className="absolute top-6 right-6 z-[60] w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg"
              >
                <X className="w-6 h-6" />
              </motion.button>

              {/* Prev */}
              {currentIndex > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={goPrev}
                  className="absolute left-4 md:left-8 z-[60] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center border border-white/20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              )}

              {/* Next */}
              {currentIndex < items.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={goNext}
                  className="absolute right-4 md:right-8 z-[60] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center border border-white/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              )}

              <LightboxImage
                src={selectedImg.image || ""}
                slideDir={slideDir}
                itemKey={selectedItem}
              />

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 text-sm">
                {currentIndex + 1} / {items.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-24 bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl font-display font-bold mb-4">{t("portfolio.cta")}</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{t("portfolio.ctaText")}</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
              onClick={() => openDiscordProfile(profile.discord)}
            >
              <MessageSquare className="w-5 h-5" />
              {t("portfolio.discuss")}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
