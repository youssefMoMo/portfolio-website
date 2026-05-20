import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import {
  X,
  Moon,
  Sun,
  Monitor,
  Globe,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { profile } from "@/lib/data";
import { useCallback, useEffect, useMemo, useState } from "react";

type SettingsModalProps = { isOpen: boolean; onClose: () => void };

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const modalVariants = {
  hidden: { opacity: 0, x: "100%", scale: 0.95 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0, x: "100%", scale: 0.95,
    transition: { type: "spring", damping: 25, stiffness: 300, duration: 0.3 },
  },
};
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: 20, y: 10 },
  visible: { opacity: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 200, damping: 15 } },
};

// Flag image filenames — files live in /public/images/global/:
// flag-en.png (US/UK flag)
// flag-ar.png (Saudi Arabia flag)
// flag-es.png (Spain flag)
const FLAG_IMAGES: Record<string, string> = {
  en: "/images/global/flag-en.png",
  ar: "/images/global/flag-ar.png",
  es: "/images/global/flag-es.png",
};

const FLAG_EMOJI: Record<string, string> = {
  en: "🇺🇸",
  ar: "🇸🇦",
  es: "🇪🇸",
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const [flagErrors, setFlagErrors] = useState<Record<string, boolean>>({});

  const themes = useMemo(() => [
    { value: "light", label: "Light", icon: Sun, color: "from-amber-400 to-orange-400" },
    { value: "dark", label: "Dark", icon: Moon, color: "from-indigo-500 to-purple-500" },
    { value: "system", label: "System", icon: Monitor, color: "from-cyan-400 to-blue-500" },
  ], []);

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

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Body scroll lock with scrollbar-width compensation
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prev = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] pointer-events-none"
          >
            <div className="h-full bg-card border-l border-white/10 shadow-2xl pointer-events-auto overflow-hidden flex flex-col">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-card/50 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold">Settings</h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Customize your experience
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              </motion.div>

              {/* Content */}
              <motion.div
                variants={containerVariants}
                initial="hidden" animate="visible"
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 sm:space-y-7"
              >
                {/* Language Section */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>Language</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {languages.map((langOption, index) => {
                      const isActive = lang === langOption.value;
                      const showEmoji = flagErrors[langOption.value];
                      return (
                        <motion.button
                          key={langOption.value}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1, type: "spring", stiffness: 300 }}
                          whileHover={{
                            scale: 1.08,
                            transition: { type: "spring", stiffness: 400, damping: 10 },
                          }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleLanguageChange(langOption.value)}
                          className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                            isActive
                              ? `bg-gradient-to-br ${langOption.color} border-transparent shadow-lg`
                              : "bg-background/50 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {/* Animated glow sweep */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                            isActive ? "" : `bg-gradient-to-r ${langOption.color}`
                          }`} style={{ opacity: isActive ? 0 : undefined }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          </div>
                          {!isActive && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br from-white to-transparent rounded-xl" />
                          )}
                          <div className="relative flex flex-col items-center gap-1.5">
                            {/* Flag image with emoji fallback */}
                            {showEmoji ? (
                              <span className="text-2xl sm:text-3xl">{FLAG_EMOJI[langOption.value]}</span>
                            ) : (
                              <img
                                src={FLAG_IMAGES[langOption.value]}
                                alt={langOption.label}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-sm"
                                onError={() => setFlagErrors((prev) => ({ ...prev, [langOption.value]: true }))}
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

                {/* Theme Section */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>Theme</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {themes.map((t, index) => {
                      const Icon = t.icon;
                      const isActive = theme === t.value;
                      return (
                        <motion.button
                          key={t.value}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.6 + index * 0.1, type: "spring", stiffness: 300 }}
                          whileHover={{
                            scale: 1.08,
                            transition: { type: "spring", stiffness: 400, damping: 10 },
                          }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleThemeChange(t.value)}
                          className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-300 overflow-hidden group ${
                            isActive
                              ? `bg-gradient-to-br ${t.color} border-transparent shadow-lg`
                              : "bg-background/50 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {/* Animated glow sweep */}
                          {!isActive && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 bg-gradient-to-br from-white to-transparent rounded-xl" />
                          )}
                          <div className="relative flex flex-col items-center gap-1.5">
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.6 + index * 0.1, type: "spring" }}
                            >
                              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                            </motion.div>
                            <span className={`text-[10px] sm:text-xs font-semibold ${
                              isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                            }`}>
                              {t.label}
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

                {/* Contact Section */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span>Contact</span>
                  </div>
                  <motion.a
                    href={DISCORD_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.03, fontWeight: 700 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white text-xs sm:text-sm font-semibold shadow-lg discord-glow transition-all duration-300 group"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <span>Open Discord DM</span>
                  </motion.a>
                </motion.div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-4 border-t border-white/10 bg-card/50 backdrop-blur-xl"
              >
                <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                  © 2026 Youssef Design - All Rights Reserved
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
