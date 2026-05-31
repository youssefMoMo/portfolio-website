// src/pages/Policies.tsx — Framer Motion Accordion + Glassmorphic Upgrade
//
// ANIMATION MANDATE (100% Framer Motion — zero CSS transitions):
//  • Policy blocks converted to accordion: animate={{ height: "auto" }} /
//    exit={{ height: 0 }} with spring physics for liquid-smooth reveal
//  • Each policy card: glassmorphic bg-background/60 backdrop-blur-md border border-white/5
//  • Staggered entrance: custom={index} → variants with delay: i * 0.05 spring
//  • Shimmer beam sweeps across card borders on hover
//  • AnchorNav buttons: whileHover + whileTap spring physics
//  • Mobile floating nav: AnimatePresence scale+opacity entry

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, RefreshCcw, Clock, DollarSign, MessageSquare,
  Lock, Code, AlertTriangle, Sparkles, FileText, Scale,
  Menu, X, ChevronRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PoliciesContent } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { openDiscord } from "@/lib/discord";
import type { TranslationKey } from "@/lib/data";

// ─── Icon map ──────────────────────────────────────────────────────────────────

const POLICY_ICONS: Record<string, React.ElementType> = {
  shield: Shield, refresh: RefreshCcw, clock: Clock,
  "dollar-sign": DollarSign, "message-square": MessageSquare,
  lock: Lock, code: Code, alert: AlertTriangle, sparkles: Sparkles, scale: Scale,
};

const POLICY_TRANSLATION_KEYS: Record<string, { title: TranslationKey; desc: TranslationKey }> = {
  shield:           { title: "policy.payment.title",       desc: "policy.payment.desc" },
  refresh:          { title: "policy.revision.title",      desc: "policy.revision.desc" },
  clock:            { title: "policy.delivery.title",      desc: "policy.delivery.desc" },
  "dollar-sign":    { title: "policy.refund.title",        desc: "policy.refund.desc" },
  "message-square": { title: "policy.communication.title", desc: "policy.communication.desc" },
};

// ─── Spring config ─────────────────────────────────────────────────────────────

const SPRING      = { type: "spring", stiffness: 400, damping: 15 } as const;
const SPRING_SOFT = { type: "spring", stiffness: 120, damping: 18 } as const;

// ─── Auto-delay stagger variants ───────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 },
  }),
};

// ─── Metallic shimmer beam ─────────────────────────────────────────────────────

function ShimmerBeam({ rounded = "rounded-2xl" }: { rounded?: string }) {
  return (
    <motion.div
      className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden z-10`}
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
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.10) 65%, transparent 100%)",
          mixBlendMode: "overlay",
        }}
      />
    </motion.div>
  );
}

// ─── Slugify ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function buildSlugs(titles: string[]): string[] {
  const seen = new Map<string, number>();
  return titles.map((title) => {
    const base  = slugify(title);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${String(count).padStart(2, "0")}`;
  });
}

// ─── AnchorNav ────────────────────────────────────────────────────────────────

function AnchorNav({
  policies,
  activeSlug,
  sectionsLabel,
}: {
  policies:     { id: string | number; title: string; icon: string; slug: string }[];
  activeSlug:   string;
  sectionsLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const scrollTo = (slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setOpen(false);
  };

  const NavList = () => (
    <ul className="space-y-1">
      {policies.map((p) => {
        const Icon     = POLICY_ICONS[p.icon] ?? Shield;
        const isActive = activeSlug === p.slug;
        return (
          <li key={p.id}>
            <motion.button
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              onClick={() => scrollTo(p.slug)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                isActive
                  ? "bg-red-500/15 text-red-300 border border-red-500/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                isActive ? "text-red-400" : "text-muted-foreground"
              }`} />
              <span className="truncate">{p.title}</span>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={SPRING}
                    className="ml-auto"
                  >
                    <ChevronRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
        <div className="bg-background/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {sectionsLabel}
          </p>
          <NavList />
        </div>
      </div>

      {/* Mobile floating toggle */}
      <div className="lg:hidden fixed bottom-6 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          transition={SPRING}
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-red-500/80 backdrop-blur-sm text-white shadow-lg flex items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={SPRING}>
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={SPRING}>
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 12 }}
              transition={SPRING}
              className="absolute bottom-14 right-0 w-56 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
            >
              <NavList />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── PolicyAccordion ──────────────────────────────────────────────────────────
// Each policy block is now an accordion — title always visible,
// description expands/collapses with liquid Framer Motion height animation.

function PolicyAccordion({
  policy,
  index,
  slug,
}: {
  policy: { id: string | number; title: string; description: string; icon: string };
  index:  number;
  slug:   string;
}) {
  const { t }       = useLanguage();
  const [open, setOpen] = useState(true); // default open for accessibility
  const Icon        = POLICY_ICONS[policy.icon] ?? Shield;
  const keys        = POLICY_TRANSLATION_KEYS[policy.icon];
  const displayTitle       = keys ? t(keys.title) : policy.title;
  const displayDescription = keys ? t(keys.desc)  : policy.description;

  return (
    <motion.article
      id={slug}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="scroll-mt-28 relative overflow-hidden bg-background/60 backdrop-blur-md border border-white/5 rounded-2xl hover:border-red-500/15"
    >
      {/* Shimmer on hover */}
      <ShimmerBeam />

      {/* Accordion header */}
      <motion.button
        whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
        whileTap={{ scale: 0.995 }}
        transition={SPRING}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-4 p-7 text-left"
      >
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={SPRING}
          className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5"
        >
          <Icon className="w-5 h-5 text-red-400" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground text-balance">{displayTitle}</h2>
            {/* Chevron rotates via spring on open/close */}
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="w-5 h-5 text-red-400/60" />
            </motion.div>
          </div>
        </div>
      </motion.button>

      {/* Accordion body — pure Framer Motion height animation */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 240, damping: 28 },
                opacity: { duration: 0.24, delay: 0.07 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { type: "spring", stiffness: 300, damping: 32 },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-7 pt-0 ml-[60px]">
              <div className="w-full h-px bg-white/5 mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayDescription}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ─── Main Policies Page ───────────────────────────────────────────────────────

export default function Policies() {
  const { t, isRTL } = useLanguage();

  const [policies, setPolicies] = useState<
    { id: string | number; title: string; description: string; icon: string; slug: string }[]
  >([]);
  const [activeSlug, setActiveSlug] = useState("");
  const observerRef  = useRef<IntersectionObserver | null>(null);
  const mountedRef   = useRef(true);

  const loadPolicies = useCallback(async () => {
    try {
      const data = (await getContent("policies")) as PoliciesContent | null;
      if (!mountedRef.current) return;
      const rawPolicies = data?.policies ?? [];
      const titles = rawPolicies.map((p: { title: string }) => p.title);
      const slugs  = buildSlugs(titles);
      setPolicies(
        rawPolicies.map((p: { id: string | number; title: string; description: string; icon: string }, i: number) => ({
          ...p, slug: slugs[i],
        }))
      );
    } catch {
      if (mountedRef.current) setPolicies([]);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadPolicies();
    return () => { mountedRef.current = false; };
  }, [loadPolicies]);

  useContentRealtime("policies", loadPolicies);

  useEffect(() => {
    if (policies.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    observerRef.current = observer;
    policies.forEach((p) => {
      const el = document.getElementById(p.slug);
      if (el) observer.observe(el);
    });
    return () => { observer.disconnect(); };
  }, [policies]);

  const navPolicies = policies.map((p) => {
    const keys = POLICY_TRANSLATION_KEYS[p.icon];
    return { id: p.id, title: keys ? t(keys.title) : p.title, icon: p.icon, slug: p.slug };
  });

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen pt-8 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SOFT}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-400 text-sm font-semibold mb-6 border border-red-500/20"
          >
            <Scale className="w-4 h-4" /> {t("policies.badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...SPRING_SOFT }}
            className="text-4xl md:text-6xl font-bold font-display mb-5 bg-gradient-to-r from-red-500 via-rose-400 to-orange-400 bg-clip-text text-transparent text-balance"
          >
            {t("policies.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...SPRING_SOFT }}
            className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed text-balance"
          >
            {t("policies.subtitle")}
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-24 h-0.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full mx-auto mt-6"
          />

          {policies.length > 3 && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-xs text-muted-foreground/60"
            >
              {policies.length} {t("policies.sections")}
            </motion.p>
          )}
        </div>

        {/* Sidebar + Accordion content */}
        {policies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-background/60 backdrop-blur-md rounded-2xl border border-red-500/10"
          >
            <FileText className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("policies.noPolicies")}</p>
          </motion.div>
        ) : (
          <div className="flex gap-8 items-start">
            <AnchorNav
              policies={navPolicies}
              activeSlug={activeSlug}
              sectionsLabel={t("policies.sections")}
            />
            <div className="flex-1 min-w-0 space-y-4">
              {policies.map((policy, i) => (
                <PolicyAccordion
                  key={policy.id}
                  policy={policy}
                  index={i}
                  slug={policy.slug}
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={SPRING_SOFT}
          className="mt-20 bg-gradient-to-br from-red-500/5 via-background/60 to-rose-500/5 backdrop-blur-xl border border-red-500/15 rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <ShimmerBeam rounded="rounded-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.07),transparent_70%)] pointer-events-none" />
          <div className="relative">
            <motion.h2
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={SPRING_SOFT}
              className="text-2xl md:text-3xl font-display font-bold mb-3 bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent text-balance"
            >
              {t("policies.questionsTitle")}
            </motion.h2>
            <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto text-balance">
              {t("policies.contactHint")}
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
            >
              <Button
                size="lg"
                className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
                onClick={openDiscord}
              >
                <MessageSquare className="w-5 h-5" /> {t("policies.contactDiscord")}
              </Button>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
