// src/pages/Policies.tsx — Anchor nav sidebar + professional legal layout
// REFACTOR CHANGELOG:
//   • OBSERVER RESCUE: cleanup closure is the sole authority for disconnecting.
//   • SLUG COLLISION PREVENTION: slugify incorporates a zero-padded index suffix.
//   • FULL i18n: every hardcoded English string resolved through t().
//   • POLICY i18n: policy titles and descriptions resolved through policy.*.title
//     / policy.*.desc keys, keyed by icon slug. Falls back to DB strings for
//     custom admin-created policies whose icon slug has no key mapping.

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, RefreshCcw, Clock, DollarSign, MessageSquare,
  Lock, Code, AlertTriangle, Sparkles, FileText, Scale,
  Menu, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PoliciesContent } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { openDiscord } from "@/lib/discord";
import type { TranslationKey } from "@/lib/data";

const POLICY_ICONS: Record<string, React.ElementType> = {
  shield: Shield, refresh: RefreshCcw, clock: Clock,
  "dollar-sign": DollarSign, "message-square": MessageSquare,
  lock: Lock, code: Code, alert: AlertTriangle, sparkles: Sparkles, scale: Scale,
};

// ── Policy i18n lookup ────────────────────────────────────────────────────────
//
// Maps icon slug → { title, desc } TranslationKey pair.
// The five canonical policies from data.ts are covered. Any custom policy added
// via the admin dashboard whose icon slug is not in this map will fall through
// to the DB-stored English strings as a safe fallback.
//
const POLICY_TRANSLATION_KEYS: Record<string, { title: TranslationKey; desc: TranslationKey }> = {
  shield:          { title: "policy.payment.title",       desc: "policy.payment.desc" },
  refresh:         { title: "policy.revision.title",      desc: "policy.revision.desc" },
  clock:           { title: "policy.delivery.title",      desc: "policy.delivery.desc" },
  "dollar-sign":   { title: "policy.refund.title",        desc: "policy.refund.desc" },
  "message-square":{ title: "policy.communication.title", desc: "policy.communication.desc" },
};

// ── slugify ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

// ── AnchorNav ────────────────────────────────────────────────────────────────

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
      const offset = 100;
      const top    = el.getBoundingClientRect().top + window.scrollY - offset;
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
            <button
              onClick={() => scrollTo(p.slug)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all duration-200 group ${
                isActive
                  ? "bg-red-500/15 text-red-300 border border-red-500/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                isActive ? "text-red-400" : "text-muted-foreground group-hover:text-primary"
              }`} />
              <span className="truncate">{p.title}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto text-red-400 flex-shrink-0" />}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
        <div className="bg-card/50 backdrop-blur-xl border border-white/8 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {sectionsLabel}
          </p>
          <NavList />
        </div>
      </div>

      {/* Mobile floating toggle */}
      <div className="lg:hidden fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-red-500/80 backdrop-blur-sm text-white shadow-lg flex items-center justify-center"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-14 right-0 w-56 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <NavList />
          </motion.div>
        )}
      </div>
    </>
  );
}

// ── PolicySection ────────────────────────────────────────────────────────────

function PolicySection({
  policy,
  index,
  slug,
}: {
  policy: { id: string | number; title: string; description: string; icon: string };
  index:  number;
  slug:   string;
}) {
  const { t } = useLanguage();
  const Icon = POLICY_ICONS[policy.icon] ?? Shield;

  // ── i18n: look up translated title & description by icon slug ──────────
  // If the icon slug is in our map, use translated strings.
  // If not (custom admin policy), fall back to DB-stored strings.
  const keys = POLICY_TRANSLATION_KEYS[policy.icon];
  const displayTitle       = keys ? t(keys.title) : policy.title;
  const displayDescription = keys ? t(keys.desc)  : policy.description;

  return (
    <motion.article
      id={slug}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.05 }}
      className="scroll-mt-28 bg-card/30 backdrop-blur-sm border border-white/6 rounded-2xl p-7 hover:border-red-500/15 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-5 h-5 text-red-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground mb-2">{displayTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{displayDescription}</p>
        </div>
      </div>
    </motion.article>
  );
}

// ── Main Policies Page ────────────────────────────────────────────────────────

export default function Policies() {
  const { t, isRTL } = useLanguage();

  const [policies,   setPolicies]   = useState<
    { id: string | number; title: string; description: string; icon: string; slug: string }[]
  >([]);
  const [activeSlug, setActiveSlug] = useState("");
  const observerRef  = useRef<IntersectionObserver | null>(null);
  const mountedRef   = useRef(true);

  // ── Load policies ─────────────────────────────────────────────────────
  const loadPolicies = useCallback(async () => {
    try {
      const data = (await getContent("policies")) as PoliciesContent | null;
      if (!mountedRef.current) return;
      const rawPolicies = data?.policies ?? [];
      const titles = rawPolicies.map((p: { title: string }) => p.title);
      const slugs  = buildSlugs(titles);
      setPolicies(
        rawPolicies.map((p: { id: string | number; title: string; description: string; icon: string }, i: number) => ({
          ...p,
          slug: slugs[i],
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

  // ── IntersectionObserver for active slug ──────────────────────────────
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

    // Cleanup: only this closure's observer is disconnected
    return () => { observer.disconnect(); };
  }, [policies]);

  // ── Build translated nav titles for AnchorNav ─────────────────────────
  // The sidebar shows translated titles while slugs remain English-based
  // (anchor IDs are generated from original DB titles, preserving links).
  const navPolicies = policies.map((p) => {
    const keys = POLICY_TRANSLATION_KEYS[p.icon];
    return {
      id:    p.id,
      title: keys ? t(keys.title) : p.title,
      icon:  p.icon,
      slug:  p.slug,
    };
  });

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen pt-8 pb-24 px-4 sm:px-6"
    >
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-400 text-sm font-semibold mb-6 border border-red-500/20"
          >
            <Scale className="w-4 h-4" /> {t("policies.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-5 bg-gradient-to-r from-red-500 via-rose-400 to-orange-400 bg-clip-text text-transparent"
          >
            {t("policies.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed"
          >
            {t("policies.subtitle")}
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-24 h-0.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full mx-auto mt-6"
          />
          {policies.length > 3 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-xs text-muted-foreground/60"
            >
              {policies.length} {t("policies.sections")}
            </motion.p>
          )}
        </div>

        {/* Sidebar + content */}
        {policies.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-2xl border border-red-500/10">
            <FileText className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("policies.noPolicies")}</p>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            <AnchorNav
              policies={navPolicies}
              activeSlug={activeSlug}
              sectionsLabel={t("policies.sections")}
            />
            <div className="flex-1 min-w-0 space-y-5">
              {policies.map((policy, i) => (
                <PolicySection key={policy.id} policy={policy} index={i} slug={policy.slug} />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 bg-gradient-to-br from-red-500/5 via-card/40 to-rose-500/5 backdrop-blur-xl border border-red-500/15 rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.07),transparent_70%)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
              {t("policies.questionsTitle")}
            </h2>
            <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto">
              {t("policies.contactHint")}
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
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
