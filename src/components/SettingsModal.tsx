// src/components/SettingsModal.tsx — Framer Motion Spring Physics Upgrade
//
// ANIMATION MANDATE (100% Framer Motion — zero CSS transitions):
//  • ToggleSwitch: converted to motion.button with whileHover/whileTap spring
//    track and thumb both animated via Framer Motion layout/animate
//  • Language cards: whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
//    transition={{ type: "spring", stiffness: 400, damping: 15 }}
//  • Performance rows: motion.div whileHover/whileTap spring on entire row
//  • Discord CTA: motion.a with spring + pulsing icon
//  • Shimmer beam on language cards and performance rows on hover
//  • Glass backdrop: bg-background/60 backdrop-blur-md border border-white/5
//
// DARK-MODE LOCK — 2026: Light mode eliminated project-wide.

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import {
  X, Globe, MessageSquare,
  Sparkles, Zap, Leaf, Info,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Performance settings keys (exported for consumers) ──────────────────────

export const PERF_BOOST_KEY      = "yd_perf_boost";
export const ECO_MODE_KEY        = "yd_eco_mode";
export const PERF_SETTINGS_EVENT = "yd-perf-settings-changed";

// ─── usePerformanceSettings ───────────────────────────────────────────────────

export function usePerformanceSettings() {
  const readBool = (key: string): boolean => {
    try { return localStorage.getItem(key) === "true"; } catch { return false; }
  };
  const [perfBoost, setPerfBoostState] = useState(() => readBool(PERF_BOOST_KEY));
  const [ecoMode,   setEcoModeState]   = useState(() => readBool(ECO_MODE_KEY));

  useEffect(() => {
    const sync = () => {
      setPerfBoostState(readBool(PERF_BOOST_KEY));
      setEcoModeState(readBool(ECO_MODE_KEY));
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  useEffect(() => {
    if (ecoMode) {
      document.documentElement.classList.add("eco-mode");
    } else {
      document.documentElement.classList.remove("eco-mode");
    }
  }, [ecoMode]);

  const setPerfBoost = useCallback((val: boolean) => {
    try { localStorage.setItem(PERF_BOOST_KEY, String(val)); } catch {}
    setPerfBoostState(val);
    window.dispatchEvent(new Event(PERF_SETTINGS_EVENT));
  }, []);

  const setEcoMode = useCallback((val: boolean) => {
    try { localStorage.setItem(ECO_MODE_KEY, String(val)); } catch {}
    setEcoModeState(val);
    if (val) {
      document.documentElement.classList.add("eco-mode");
    } else {
      document.documentElement.classList.remove("eco-mode");
    }
    window.dispatchEvent(new Event(PERF_SETTINGS_EVENT));
  }, []);

  return { perfBoost, setPerfBoost, ecoMode, setEcoMode };
}

// ─── Spring configs ────────────────────────────────────────────────────────────

const SPRING        = { type: "spring", stiffness: 400, damping: 15 } as const;
const SPRING_SOFT   = { type: "spring", stiffness: 200, damping: 18 } as const;

// ─── Framer Motion panel variants ─────────────────────────────────────────────

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2  } },
};
const modalVariants = {
  hidden:  { opacity: 0, x: "100%", scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", damping: 28, stiffness: 320 } },
  exit:    { opacity: 0, x: "100%", scale: 0.97, transition: { type: "spring", damping: 28, stiffness: 320, duration: 0.25 } },
};
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};
const itemVariants = {
  hidden:  { opacity: 0, x: 16, y: 8 },
  visible: { opacity: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 200, damping: 18 } },
};

// ─── Flag data ─────────────────────────────────────────────────────────────────

const FLAG_IMAGES: Record<string, string> = {
  en: "/images/global/flag-en.png",
  ar: "/images/global/flag-ar.png",
  es: "/images/global/flag-es.png",
};
const FLAG_EMOJI: Record<string, string> = { en: "🇺🇸", ar: "🇸🇦", es: "🇪🇸" };

// ─── Metallic shimmer beam ─────────────────────────────────────────────────────

function ShimmerBeam({ rounded = "rounded-xl" }: { rounded?: string }) {
  return (
    <motion.div
      className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden z-10`}
      initial="rest"
      whileHover="hover"
    >
      <motion.div
        variants={{
          rest:  { x: "-120%", opacity: 0 },
          hover: {
            x: "220%",
            opacity: [0, 0.6, 0.6, 0],
            transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
          },
        }}
        className="absolute inset-y-0 w-1/3"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 35%, rgba(255,255,255,0.36) 50%, rgba(255,255,255,0.14) 65%, transparent 100%)",
          mixBlendMode: "overlay",
        }}
      />
    </motion.div>
  );
}

// ─── MotionToggleSwitch — 100% Framer Motion ──────────────────────────────────
// No CSS transitions: track color via motion.div animate, thumb via motion.div layout

function MotionToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
  id:       string;
}) {
  return (
    <motion.button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {/* Track */}
      <motion.span
        className="absolute inset-0 rounded-full"
        animate={{
          backgroundColor: checked ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />

      {/* Thumb */}
      <motion.span
        className="relative pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg m-0.5"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
      />
    </motion.button>
  );
}

// ─── PerformanceRow — glassmorphic + spring hover ─────────────────────────────

function PerformanceRow({
  id,
  icon: Icon,
  iconClass,
  title,
  desc,
  checked,
  onChange,
  containerClass = "border-white/10 bg-background/60",
}: {
  id:             string;
  icon:           React.ElementType;
  iconClass:      string;
  title:          string;
  desc:           string;
  checked:        boolean;
  onChange:       (v: boolean) => void;
  containerClass?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING}
      className={`relative flex items-center justify-between gap-3 rounded-xl border backdrop-blur-md px-4 py-3.5 overflow-hidden ${containerClass}`}
    >
      <ShimmerBeam />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconClass}`} />
          <p className="text-xs sm:text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <MotionToggleSwitch id={id} checked={checked} onChange={onChange} />
    </motion.div>
  );
}

// ─── Main SettingsModal ───────────────────────────────────────────────────────

type SettingsModalProps = { isOpen: boolean; onClose: () => void };

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { lang, setLang, t, isRTL } = useLanguage();
  const { perfBoost, setPerfBoost, ecoMode, setEcoMode } = usePerformanceSettings();
  const [flagErrors, setFlagErrors] = useState<Record<string, boolean>>({});

  const languages = useMemo(() => [
    { value: "en", label: "English",  color: "from-blue-500 to-indigo-500" },
    { value: "ar", label: "العربية", color: "from-green-500 to-emerald-500" },
    { value: "es", label: "Español",  color: "from-red-500 to-orange-500" },
  ], []);

  const handleLanguageChange = useCallback((newLang: string) => {
    if (newLang === lang) return;
    onClose();
    setLang(newLang as "en" | "ar" | "es");
  }, [lang, setLang, onClose]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const body           = document.body;
    const html           = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = scrollbarWidth + "px";
    return () => {
      body.style.overflow     = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.div
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] pointer-events-none"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="h-full bg-card border-l border-white/10 shadow-2xl pointer-events-auto overflow-hidden flex flex-col">

              {/* ── Header ── */}
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, type: "spring", stiffness: 200 }}
                className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-background/60 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.38, type: "spring", stiffness: 300 }}
                    className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      {t("settings.title")}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("settings.customize")}
                    </p>
                  </div>
                </div>

                {/* Close button — spring rotate on hover */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING}
                  onClick={onClose}
                  className="p-2 rounded-full text-foreground/60 hover:bg-white/10"
                  aria-label={t("settings.closeLabel")}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              </motion.div>

              {/* ── Scrollable content ── */}
              <motion.div
                variants={containerVariants}
                initial="hidden" animate="visible"
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 sm:space-y-7"
              >

                {/* ── Language ── */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.language")}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {languages.map((langOption, index) => {
                      const isActive  = lang === langOption.value;
                      const showEmoji = flagErrors[langOption.value];

                      return (
                        <motion.button
                          key={langOption.value}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.45 + index * 0.1, type: "spring", stiffness: 300 }}
                          // Mandatory spring physics
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          style={{ transition: undefined }} // ensure no CSS fallback
                          onClick={() => handleLanguageChange(langOption.value)}
                          className={`relative p-3 sm:p-4 rounded-xl border overflow-hidden group w-full min-h-[80px] sm:min-h-[88px] ${
                            isActive
                              ? "bg-gradient-to-br " + langOption.color + " border-transparent shadow-lg"
                              : "bg-background/60 backdrop-blur-md border-white/5 hover:border-white/20"
                          }`}
                        >
                          {/* Shimmer on inactive cards */}
                          {!isActive && <ShimmerBeam />}

                          {/* Subtle hover glow on inactive */}
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-transparent opacity-0"
                              whileHover={{ opacity: 0.06 }}
                              transition={{ duration: 0.2 }}
                            />
                          )}

                          <div className="relative flex flex-col items-center gap-1.5">
                            {showEmoji ? (
                              <span className="text-2xl sm:text-3xl">{FLAG_EMOJI[langOption.value]}</span>
                            ) : (
                              <img
                                src={FLAG_IMAGES[langOption.value]}
                                alt={langOption.label}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-sm flex-shrink-0 aspect-square"
                                onError={() =>
                                  setFlagErrors((prev) => ({ ...prev, [langOption.value]: true }))
                                }
                              />
                            )}
                            <span className={`text-[10px] sm:text-xs font-semibold ${
                              isActive ? "text-white" : "text-muted-foreground"
                            }`}>
                              {langOption.label}
                            </span>
                          </div>

                          {/* Active indicator with layoutId */}
                          {isActive && (
                            <motion.div
                              layoutId="language-indicator"
                              className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* ── Performance ── */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.performance")}</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Performance Booster */}
                    <PerformanceRow
                      id="perf-boost-toggle"
                      icon={Zap}
                      iconClass="text-amber-400"
                      title={t("settings.perfBooster")}
                      desc={t("settings.perfBoosterDesc")}
                      checked={perfBoost}
                      onChange={setPerfBoost}
                    />

                    {/* Eco Mode */}
                    <PerformanceRow
                      id="eco-mode-toggle"
                      icon={Leaf}
                      iconClass={ecoMode ? "text-emerald-400" : "text-muted-foreground"}
                      title={t("settings.ecoMode")}
                      desc={t("settings.ecoModeDesc")}
                      checked={ecoMode}
                      onChange={setEcoMode}
                      containerClass={
                        ecoMode
                          ? "border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md"
                          : "border-white/10 bg-background/60 backdrop-blur-md"
                      }
                    />

                    {/* Eco-active info chip */}
                    <AnimatePresence>
                      {ecoMode && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={SPRING_SOFT}
                          className="flex items-start gap-2 rounded-lg bg-emerald-900/20 border border-emerald-500/20 px-3 py-2.5"
                        >
                          <Info className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                            {t("settings.ecoActive")}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* ── Contact ── */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.contact")}</span>
                  </div>

                  <motion.a
                    href={DISCORD_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    // Spring hover + tap — no CSS
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING}
                    className="relative flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white text-xs sm:text-sm font-semibold shadow-lg overflow-hidden"
                  >
                    <ShimmerBeam />
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.div>
                    <span>{t("settings.openDiscord")}</span>
                  </motion.a>
                </motion.div>

              </motion.div>

              {/* ── Footer ── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 }}
                className="p-4 border-t border-white/10 bg-background/60 backdrop-blur-xl"
              >
                <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                  {t("settings.copyright")}
                </p>
              </motion.div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
