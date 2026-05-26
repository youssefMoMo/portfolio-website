// src/components/SettingsModal.tsx
//
// ─── SOURCE OF TRUTH FOR PERFORMANCE SETTINGS ───────────────────────────────
//
// This file owns the canonical performance settings layer for the entire app.
// `usePerformanceSettings` is the ONLY hook any component should use to read
// or write eco mode / perf boost state. Direct localStorage access with
// ad-hoc key strings is forbidden — all consumers import from here.
//
// Storage keys (single authoritative definition):
//   yd_perf_boost  — Performance Booster (reduces repaint surfaces)
//   yd_eco_mode    — Low-End Device Mode (disables marquees, particles, etc.)
//
// Event bus:
//   `yd-perf-settings-changed` (window CustomEvent) — fired on every toggle.
//   PerformanceOptimizer, DualMarqueeSection, SkillsMarquee, ReviewsMarquee
//   all subscribe and react within the same tab.

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import {
  X, Moon, Sun, Monitor, Globe, MessageSquare,
  Sparkles, Zap, Leaf, Info,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
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

// ─── Framer Motion variants ───────────────────────────────────────────────────

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};
const modalVariants = {
  hidden:  { opacity: 0, x: "100%", scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: "spring", damping: 28, stiffness: 320 },
  },
  exit: {
    opacity: 0, x: "100%", scale: 0.97,
    transition: { type: "spring", damping: 28, stiffness: 320, duration: 0.25 },
  },
};
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};
const itemVariants = {
  hidden:  { opacity: 0, x: 16, y: 8 },
  visible: {
    opacity: 1, x: 0, y: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

// ─── Flag images & emoji fallbacks ───────────────────────────────────────────

const FLAG_IMAGES: Record<string, string> = {
  en: "/images/global/flag-en.png",
  ar: "/images/global/flag-ar.png",
  es: "/images/global/flag-es.png",
};
const FLAG_EMOJI: Record<string, string> = { en: "🇺🇸", ar: "🇸🇦", es: "🇪🇸" };

// ─── ToggleSwitch ──────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                  border-2 border-transparent transition-colors duration-200 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-primary/60
                  ${checked ? "bg-primary" : "bg-white/15"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white
                    shadow-lg transform transition-transform duration-200
                    ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ─── Main SettingsModal ───────────────────────────────────────────────────────

type SettingsModalProps = { isOpen: boolean; onClose: () => void };

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme }             = useTheme();
  const { lang, setLang, t, isRTL }     = useLanguage();
  const { perfBoost, setPerfBoost, ecoMode, setEcoMode } = usePerformanceSettings();
  const [flagErrors, setFlagErrors]     = useState<Record<string, boolean>>({});

  // Theme labels are resolved via t() so they switch instantly on language change
  const themes = useMemo(() => [
    { value: "light",  labelKey: "settings.themeLight",  icon: Sun,     color: "from-amber-400 to-orange-400" },
    { value: "dark",   labelKey: "settings.themeDark",   icon: Moon,    color: "from-indigo-500 to-purple-500" },
    { value: "system", labelKey: "settings.themeSystem", icon: Monitor, color: "from-cyan-400 to-blue-500" },
  ] as const, []);

  const languages = useMemo(() => [
    { value: "en", label: "English", color: "from-blue-500 to-indigo-500" },
    { value: "ar", label: "العربية", color: "from-green-500 to-emerald-500" },
    { value: "es", label: "Español", color: "from-red-500 to-orange-500" },
  ], []);

  const handleLanguageChange = useCallback((newLang: string) => {
    if (newLang === lang) return;
    onClose();
    setLang(newLang as "en" | "ar" | "es");
  }, [lang, setLang, onClose]);

  const handleThemeChange = useCallback((newTheme: string) => {
    if (newTheme === theme) return;
    onClose();
    setTheme(newTheme as "dark" | "light" | "system");
  }, [theme, setTheme, onClose]);

  // ESC key closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Body scroll lock with scrollbar compensation
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

          {/* Slide-in panel — always slides from right regardless of RTL */}
          <motion.div
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] pointer-events-none"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="h-full bg-card border-l border-neutral-200 dark:border-white/10 shadow-2xl pointer-events-auto overflow-hidden flex flex-col">

              {/* ── Header ─────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, type: "spring", stiffness: 200 }}
                className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-white/10 bg-card/50 backdrop-blur-xl"
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
                    <h2 className="text-base sm:text-lg font-bold">{t("settings.title")}</h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("settings.customize")}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label={t("settings.closeLabel")}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              </motion.div>

              {/* ── Scrollable content ──────────────────────────────── */}
              <motion.div
                variants={containerVariants}
                initial="hidden" animate="visible"
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 sm:space-y-7"
              >

                {/* Language */}
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
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleLanguageChange(langOption.value)}
                          className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                            isActive
                              ? "bg-gradient-to-br " + langOption.color + " border-transparent shadow-lg"
                              : "bg-neutral-100 dark:bg-background/50 border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20"
                          }`}
                        >
                          {!isActive && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br from-white to-transparent rounded-xl" />
                          )}
                          <div className="relative flex flex-col items-center gap-1.5">
                            {showEmoji ? (
                              <span className="text-2xl sm:text-3xl">
                                {FLAG_EMOJI[langOption.value]}
                              </span>
                            ) : (
                              <img
                                src={FLAG_IMAGES[langOption.value]}
                                alt={langOption.label}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-sm"
                                onError={() =>
                                  setFlagErrors((prev) => ({ ...prev, [langOption.value]: true }))
                                }
                              />
                            )}
                            <span className={`text-[10px] sm:text-xs font-semibold ${
                              isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                            }`}>
                              {langOption.label}
                            </span>
                          </div>
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

                {/* Theme */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.theme")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {themes.map((th, index) => {
                      const Icon     = th.icon;
                      const isActive = theme === th.value;
                      return (
                        <motion.button
                          key={th.value}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.55 + index * 0.1, type: "spring", stiffness: 300 }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleThemeChange(th.value)}
                          className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                            isActive
                              ? "bg-gradient-to-br " + th.color + " border-transparent shadow-lg"
                              : "bg-neutral-100 dark:bg-background/50 border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20"
                          }`}
                        >
                          {!isActive && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br from-white to-transparent rounded-xl" />
                          )}
                          <div className="relative flex flex-col items-center gap-1.5">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.55 + index * 0.1, type: "spring" }}
                            >
                              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                              }`} />
                            </motion.div>
                            <span className={`text-[10px] sm:text-xs font-semibold ${
                              isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                            }`}>
                              {t(th.labelKey)}
                            </span>
                          </div>
                          {isActive && (
                            <motion.div
                              layoutId="theme-indicator"
                              className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* ── Performance ─────────────────────────────────── */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.performance")}</span>
                  </div>

                  <div className="space-y-2.5">

                    {/* Performance Booster */}
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-background/50 px-4 py-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <p className="text-xs sm:text-sm font-semibold text-foreground">
                            {t("settings.perfBooster")}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          {t("settings.perfBoosterDesc")}
                        </p>
                      </div>
                      <ToggleSwitch
                        id="perf-boost-toggle"
                        checked={perfBoost}
                        onChange={setPerfBoost}
                      />
                    </div>

                    {/* Low-End Device (Eco) Mode */}
                    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors duration-300 ${
                      ecoMode
                        ? "border-emerald-500/40 bg-emerald-950/20 dark:bg-emerald-950/20"
                        : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-background/50"
                    }`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Leaf className={`w-3.5 h-3.5 flex-shrink-0 ${
                            ecoMode ? "text-emerald-400" : "text-muted-foreground"
                          }`} />
                          <p className="text-xs sm:text-sm font-semibold text-foreground">
                            {t("settings.ecoMode")}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          {t("settings.ecoModeDesc")}
                        </p>
                      </div>
                      <ToggleSwitch
                        id="eco-mode-toggle"
                        checked={ecoMode}
                        onChange={setEcoMode}
                      />
                    </div>

                    {/* Info chip when eco is active */}
                    <AnimatePresence>
                      {ecoMode && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
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

                {/* Contact */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>{t("settings.contact")}</span>
                  </div>
                  <motion.a
                    href={DISCORD_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white text-xs sm:text-sm font-semibold shadow-lg transition-all duration-300 group"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.div>
                    <span>{t("settings.openDiscord")}</span>
                  </motion.a>
                </motion.div>

              </motion.div>

              {/* ── Footer ──────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 }}
                className="p-4 border-t border-neutral-200 dark:border-white/10 bg-card/50 backdrop-blur-xl"
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
