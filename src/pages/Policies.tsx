// src/pages/Policies.tsx — Phase 2: Anchor nav sidebar + professional legal layout
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

const POLICY_ICONS: Record<string, React.ElementType> = {
  shield: Shield, refresh: RefreshCcw, clock: Clock,
  "dollar-sign": DollarSign, "message-square": MessageSquare,
  lock: Lock, code: Code, alert: AlertTriangle, sparkles: Sparkles, scale: Scale,
};

// Slug used for anchor linking
function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Sticky section anchor nav (desktop sidebar) ─────────────────
function AnchorNav({
  policies,
  activeSlug,
}: {
  policies: { id: string | number; title: string; icon: string }[];
  activeSlug: string;
}) {
  const [open, setOpen] = useState(false);

  const scrollTo = (slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      const offset = 100;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setOpen(false);
  };

  const NavList = () => (
    <ul className="space-y-1">
      {policies.map(p => {
        const slug = slugify(p.title);
        const Icon = POLICY_ICONS[p.icon] ?? Shield;
        const isActive = activeSlug === slug;
        return (
          <li key={p.id}>
            <button
              onClick={() => scrollTo(slug)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all duration-200 group ${
                isActive
                  ? "bg-red-500/15 text-red-300 border border-red-500/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-red-400" : "text-muted-foreground group-hover:text-primary"}`} />
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
      {/* Desktop sidebar — visible lg+ */}
      <div className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
        <div className="bg-card/50 backdrop-blur-xl border border-white/8 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            Policy Sections
          </p>
          <NavList />
        </div>
      </div>

      {/* Mobile floating toggle */}
      <div className="lg:hidden fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setOpen(v => !v)}
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

// ── Individual policy section ────────────────────────────────────
function PolicySection({
  policy, index,
}: {
  policy: { id: string | number; title: string; description: string; icon: string };
  index: number;
}) {
  const slug = slugify(policy.title);
  const Icon = POLICY_ICONS[policy.icon] ?? Shield;

  return (
    <motion.section
      id={slug}
      key={policy.id}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="group relative rounded-2xl bg-card/40 backdrop-blur-xl border border-red-500/10 hover:border-red-500/25 p-7 md:p-8 transition-all duration-300 scroll-mt-28 overflow-hidden"
    >
      {/* Ambient gradient */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/4 via-transparent to-rose-500/4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Section number */}
      <div className="absolute top-4 right-5 text-[10px] font-bold text-muted-foreground/30 tabular-nums">
        §{String(index + 1).padStart(2, "0")}
      </div>

      <div className="relative flex items-start gap-5">
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
          transition={{ duration: 0.35 }}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mt-0.5"
        >
          <Icon className="w-5 h-5 text-red-400" />
        </motion.div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Anchor link on title */}
          <a href={`#${slug}`} className="group/anchor">
            <h3 className="text-lg font-bold font-display mb-3 text-red-50 group-hover:text-red-300 group-hover/anchor:text-red-400 transition-colors leading-snug flex items-center gap-2">
              {policy.title}
              <span className="opacity-0 group-hover/anchor:opacity-60 text-sm">¶</span>
            </h3>
          </a>
          <p className="text-muted-foreground leading-[1.85] text-sm">
            {policy.description}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function Policies() {
  const { t } = useLanguage();
  const [content, setContent]     = useState<PoliciesContent | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeSlug, setActiveSlug] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getContent("policies");
      setContent(data);
      setLoading(false);
    })();
  }, []);

  useContentRealtime("policies", async () => {
    try { const data = await getContent("policies"); setContent(data); } catch {}
  });

  const policies = content?.policies?.filter(p => p.is_published !== false) ?? [];

  // Intersection observer for active nav highlight
  useEffect(() => {
    if (policies.length === 0) return;
    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });
        if (visible.length > 0) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    const els = policies.map(p => document.getElementById(slugify(p.title))).filter(Boolean);
    els.forEach(el => el && observer.observe(el));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [policies.length, content]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-red-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-400 text-sm font-semibold mb-6 border border-red-500/20">
            <Scale className="w-4 h-4" /> {t("policies.badge")}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-5 bg-gradient-to-r from-red-500 via-rose-400 to-orange-400 bg-clip-text text-transparent">
            {t("policies.title")}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            {t("policies.subtitle")}
          </motion.p>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
            className="w-24 h-0.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full mx-auto mt-6" />

          {/* Quick navigation hint */}
          {policies.length > 3 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-4 text-xs text-muted-foreground/60">
              {policies.length} sections — use the sidebar (desktop) or floating button (mobile) to jump directly
            </motion.p>
          )}
        </div>

        {/* ── Sidebar + content layout ── */}
        {policies.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-2xl border border-red-500/10">
            <FileText className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("policies.noPolicies")}</p>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* Sticky sidebar */}
            <AnchorNav
              policies={policies.map(p => ({ id: p.id, title: p.title, icon: p.icon }))}
              activeSlug={activeSlug}
            />

            {/* Policy sections */}
            <div className="flex-1 min-w-0 space-y-5">
              {policies.map((policy, i) => (
                <PolicySection key={policy.id} policy={policy} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-20 bg-gradient-to-br from-red-500/5 via-card/40 to-rose-500/5 backdrop-blur-xl border border-red-500/15 rounded-3xl p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.07),transparent_70%)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3 bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
              {t("policies.questionsTitle")}
            </h2>
            <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto">
              Have questions about any of these policies? Reach out directly on Discord.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow" onClick={openDiscord}>
                <MessageSquare className="w-5 h-5" /> {t("policies.contactDiscord")}
              </Button>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
