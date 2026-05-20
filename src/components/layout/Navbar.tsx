import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Settings, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISCORD_PROFILE_URL } from "@/lib/discord";
import { profile, type TranslationKey } from "@/lib/data";
import { useLanguage } from "@/hooks/use-language";
import { SettingsModal } from "@/components/SettingsModal";
import { SafeImage } from "@/components/SafeImage";

const navLinks: Array<{ key: TranslationKey; path: string }> = [
  { key: "nav.home",      path: "/" },
  { key: "nav.portfolio", path: "/portfolio" },
  { key: "nav.games",     path: "/games" },
  { key: "nav.pricing",   path: "/pricing" },
  { key: "nav.reviews",   path: "/reviews" },
  { key: "nav.policies",  path: "/policies" },
];

const PROFILE_FALLBACK = (
  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
    Y
  </div>
);

export function Navbar() {
  const [location]        = useLocation();
  const { t }             = useLanguage();
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [time,      setTime]      = useState("");
  const [gmtOffset, setGmtOffset] = useState(2);

  // ── Egypt seasonal timezone utility ──────────────────────────────────────
  // Egypt observes GMT+3 (summer) from the last Friday of April through the
  // last Thursday of October, and GMT+2 (winter) for the rest of the year.
  // This function is pure and recalculates on every tick so it self-corrects
  // at the exact moment of the seasonal boundary without any hardcoded dates.
  const getEgyptOffset = (): number => {
    const now  = new Date();
    const year = now.getFullYear();

    const lastWeekdayOfMonth = (y: number, month: number, weekday: number): Date => {
      // month: 0-indexed (3 = April, 9 = October); weekday: 0=Sun … 6=Sat
      const lastDay = new Date(y, month + 1, 0).getDate();
      for (let d = lastDay; d >= 1; d--) {
        if (new Date(y, month, d).getDay() === weekday) {
          return new Date(y, month, d, 0, 0, 0, 0);
        }
      }
      return new Date(y, month, lastDay, 0, 0, 0, 0);
    };

    // Summer window: last Friday of April (start, inclusive) →
    //                last Thursday of October (end-of-day, inclusive)
    const summerStart = lastWeekdayOfMonth(year, 3, 5);   // last Friday of April
    const summerEnd   = lastWeekdayOfMonth(year, 9, 4);   // last Thursday of October
    summerEnd.setHours(23, 59, 59, 999);

    return now >= summerStart && now <= summerEnd ? 3 : 2;
  };

  // Build an HH:MM:SS string for the given UTC offset (avoids relying on the
  // host machine's local timezone, which may differ from Egypt).
  const formatEgyptTime = (offset: number): string => {
    const now    = new Date();
    const utcMs  = now.getTime() + now.getTimezoneOffset() * 60_000;
    const local  = new Date(utcMs + offset * 3_600_000);
    return local.toLocaleTimeString("en-US", { hour12: false });
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  // Initialise on first client render (avoids SSR mismatch)
  useEffect(() => {
    const offset = getEgyptOffset();
    setGmtOffset(offset);
    setTime(formatEgyptTime(offset));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const offset = getEgyptOffset();
      setGmtOffset(offset);
      setTime(formatEgyptTime(offset));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  

  return (
    <>
      <header
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-background/90 backdrop-blur-lg border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <SafeImage
                src="/images/global/profile.png"
                alt="Youssef"
                className="w-8 h-8 rounded-full object-cover border-2 border-primary/30 group-hover:border-primary transition-colors"
                wrapperClassName="w-8 h-8 rounded-full"
                fallbackIcon={PROFILE_FALLBACK}
                containerClassName="w-8 h-8 rounded-full"
              />
            </motion.div>
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              youssef_design
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`relative text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                  location === link.path
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t(link.key)}
                {location === link.path && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* ── Clock + GMT badge ──────────────────────────────────────── */}
            <div className="hidden sm:flex items-center gap-1.5">
              {/* Live time display */}
              <div className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border/60 rounded-md px-2 py-1 tabular-nums w-[70px] text-center leading-none">
                {time}
              </div>
              {/* Dynamic GMT offset badge — auto-switches GMT+2 ↔ GMT+3 seasonally */}
              <div
                className="text-[10px] font-mono font-semibold leading-none px-2 py-1 rounded-md border border-border/60 bg-muted/40 text-muted-foreground tabular-nums"
                title={
                  gmtOffset === 3
                    ? "Egypt Summer Time (GMT+3) — last Friday of April → last Thursday of October"
                    : "Egypt Winter Time (GMT+2)"
                }
              >
                GMT+{gmtOffset}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="rounded-full w-9 h-9 hover:bg-muted"
            >
              <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </Button>

            <a
              href={DISCORD_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-8 items-center justify-center rounded-full bg-[#5865F2] px-4 text-xs font-semibold text-white shadow transition-colors hover:bg-[#4752C4] gap-1.5 discord-glow"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discord</span>
            </a>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl lg:hidden"
            >
              <div className="flex flex-col h-full p-6">
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-2.5">
                    <SafeImage
                      src="/images/global/profile.png"
                      alt="Y"
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary/30"
                      wrapperClassName="w-8 h-8 rounded-full"
                      fallbackIcon={PROFILE_FALLBACK}
                      containerClassName="w-8 h-8 rounded-full"
                    />
                    <span className="font-display text-sm font-bold">youssef_design</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <nav className="flex flex-col gap-4 text-xl font-display font-medium">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Link
                        href={link.path}
                        className={`block py-2 ${
                          location === link.path ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {t(link.key)}
                      </Link>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navLinks.length * 0.08 }}
                    className="mt-4"
                  >
                    <a
                      href={DISCORD_PROFILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#5865F2] px-6 text-base font-medium text-white shadow hover:bg-[#4752C4] gap-2 discord-glow"
                    >
                      <MessageSquare className="h-5 w-5" />
                      <span>{t("btn.discord")}</span>
                    </a>
                  </motion.div>
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
