// src/pages/Pricing.tsx — Framer Motion Glassmorphic + Accordion Upgrade
//
// ANIMATION MANDATE (100% Framer Motion — zero CSS transitions):
//  • Plan cards: custom={index} staggered spring entrance + whileHover scale+y
//  • Shimmer beam sweeps across plan card borders exclusively on hover
//  • FAQ: animate={{ height: "auto" }} / exit={{ height: 0 }} liquid accordion
//  • "Why Choose Me" cards: staggered spring entrance via whileInView + custom
//  • All CTAs and interactive elements: whileHover + whileTap spring physics
//  • Glassmorphic holders: bg-background/60 backdrop-blur-md border border-white/5

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Check, Star, Zap, Layers, Gem, Crown,
  Infinity, FileInput, MessageSquare, ChevronDown, X,
  Copy, CheckCheck, Bolt, RefreshCw, Clock, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PricingContent, PricingPlan, FaqItem } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { openDiscord } from "@/lib/discord";
import { Modal } from "@/components/ui/Modal";
import type { TranslationKey } from "@/lib/data";

type PricingPlanExtended = PricingPlan & {
  delivery_time?:   string;
  revisions_count?: number;
  badge?:           string | null;
};

const DEFAULT_DELIVERY_META = { delivery: "3–5 days", revisions: 3 } as const;

const iconMap: Record<string, React.ElementType> = {
  zap: Zap, layers: Layers, gem: Gem, crown: Crown,
  infinity: Infinity, "file-import": FileInput,
};

const PLAN_NAME_KEYS: Record<number, TranslationKey> = {
  1: "pricing.tier.1", 2: "pricing.tier.2", 3: "pricing.tier.3",
  4: "pricing.tier.4", 5: "pricing.tier.5", 6: "pricing.tier.6",
};
const PLAN_FRAMES_KEYS: Record<number, TranslationKey> = {
  1: "pricing.p1.frames", 2: "pricing.p2.frames", 3: "pricing.p3.frames",
  4: "pricing.p4.frames", 5: "pricing.p5.frames", 6: "pricing.p6.frames",
};
const PLAN_FEATURES_KEYS: Record<number, [TranslationKey, TranslationKey, TranslationKey, TranslationKey]> = {
  1: ["pricing.p1.f1","pricing.p1.f2","pricing.p1.f3","pricing.p1.f4"],
  2: ["pricing.p2.f1","pricing.p2.f2","pricing.p2.f3","pricing.p2.f4"],
  3: ["pricing.p3.f1","pricing.p3.f2","pricing.p3.f3","pricing.p3.f4"],
  4: ["pricing.p4.f1","pricing.p4.f2","pricing.p4.f3","pricing.p4.f4"],
  5: ["pricing.p5.f1","pricing.p5.f2","pricing.p5.f3","pricing.p5.f4"],
  6: ["pricing.p6.f1","pricing.p6.f2","pricing.p6.f3","pricing.p6.f4"],
};
const FAQ_KEYS: Record<string, { q: TranslationKey; a: TranslationKey }> = {
  "1":{ q:"faq.1.q", a:"faq.1.a" }, "2":{ q:"faq.2.q", a:"faq.2.a" },
  "3":{ q:"faq.3.q", a:"faq.3.a" }, "4":{ q:"faq.4.q", a:"faq.4.a" },
  "5":{ q:"faq.5.q", a:"faq.5.a" }, "6":{ q:"faq.6.q", a:"faq.6.a" },
  "7":{ q:"faq.7.q", a:"faq.7.a" }, "8":{ q:"faq.8.q", a:"faq.8.a" },
};

// ─── Spring config ─────────────────────────────────────────────────────────────

const SPRING        = { type: "spring", stiffness: 400, damping: 15 } as const;
const SPRING_SOFT   = { type: "spring", stiffness: 120, damping: 18 } as const;

// ─── Auto-delay stagger variants ───────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: "spring", stiffness: 120, damping: 18 },
  }),
};

const whyVariants = {
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
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.30) 50%, rgba(255,255,255,0.12) 65%, transparent 100%)",
          mixBlendMode: "overlay",
        }}
      />
    </motion.div>
  );
}

// ─── OrderModal ────────────────────────────────────────────────────────────────

function OrderModal({ plan, onClose }: { plan: PricingPlanExtended; onClose: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const message = `Hello\n\nSelected plan details:\nPlan: ${plan.name}\nPrice (USD): $${plan.price_usd}\nPrice (Robux): ${plan.price_robux}+Tax\nFrames: ${plan.frames}\nFeatures: ${plan.features?.join(", ")}\n\nI want this plan at these prices`;

  const handleCopy = async (): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(message); return true; }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = message; ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
    } catch { return false; }
  };

  const onCopyClick = async () => {
    if (await handleCopy()) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <Modal open={true} onClose={onClose} ariaLabel={t("pricing.orderTitle")}
      contentClassName="w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-white">{t("pricing.orderTitle")}</h2>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
          transition={SPRING} onClick={onClose}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="mx-6 mb-6 p-5 bg-[#1a1d27] border border-white/5 rounded-xl">
        <pre className="text-sm text-neutral-700 dark:text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
          {message}
        </pre>
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
          <Button variant="outline" className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={onCopyClick}>
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span key="copied" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="flex items-center gap-2" transition={SPRING}>
                  <CheckCheck className="w-4 h-4 text-green-500" /> {t("pricing.copied")}
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="flex items-center gap-2" transition={SPRING}>
                  <Copy className="w-4 h-4" /> {t("pricing.copyMsg")}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
          <Button className="w-full gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
            onClick={async () => { await onCopyClick(); openDiscord(); }}>
            <MessageSquare className="w-4 h-4" /> {t("pricing.openDM")}
          </Button>
        </motion.div>
      </div>
    </Modal>
  );
}

// ─── FAQ Accordion Item ────────────────────────────────────────────────────────

function FaqAccordion({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  const faqKeys     = FAQ_KEYS[String(faq.id)];
  const translatedQ = faqKeys ? t(faqKeys.q) : faq.question;
  const translatedA = faqKeys ? t(faqKeys.a) : faq.answer;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="rounded-xl border border-white/8 bg-background/60 backdrop-blur-md overflow-hidden relative"
    >
      <ShimmerBeam rounded="rounded-xl" />

      <motion.button
        whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        whileTap={{ scale: 0.995 }}
        transition={SPRING}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-white/90 pr-4">{translatedQ}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      </motion.button>

      {/* Pure Framer Motion height animation — no CSS transitions */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 240, damping: 26 },
                opacity: { duration: 0.22, delay: 0.06 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-white/5 pt-3">
              {translatedA}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  index,
  onSelect,
}: {
  plan: PricingPlanExtended;
  index: number;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const Icon = iconMap[plan.icon ?? ""] ?? Star;

  const planId           = Number(plan.id);
  const translatedName   = PLAN_NAME_KEYS[planId] ? t(PLAN_NAME_KEYS[planId]) : plan.name;
  const translatedFrames = PLAN_FRAMES_KEYS[planId] ? t(PLAN_FRAMES_KEYS[planId]) : plan.frames;
  const featureKeys      = PLAN_FEATURES_KEYS[planId];
  const translatedFeat   = featureKeys ? featureKeys.map((k) => t(k)) : (plan.features ?? []);
  const badgeLabel       = plan.badge ?? (plan.featured ? t("pricing.featured") : null);
  const deliveryLabel    = plan.delivery_time ?? DEFAULT_DELIVERY_META.delivery;
  const revisionsCount   = plan.revisions_count ?? DEFAULT_DELIVERY_META.revisions;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -6 }}
      whileTap={{ scale: 0.99 }}
      transition={SPRING}
      className="relative"
    >
      {/* Top badge */}
      {badgeLabel && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.2, ...SPRING }}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"
        >
          <span className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase whitespace-nowrap shadow-lg ${
            plan.featured
              ? "bg-primary text-white"
              : "bg-[#27282a] border border-primary/30 text-primary"
          }`}>
            {badgeLabel}
          </span>
        </motion.div>
      )}

      {/* Glassmorphic card */}
      <div className={`h-full rounded-2xl p-7 flex flex-col gap-5 border relative overflow-hidden bg-background/60 backdrop-blur-md ${
        plan.featured
          ? "border-primary/50 shadow-xl shadow-primary/12 ring-1 ring-primary/10"
          : "border-white/8 hover:border-white/20"
      }`}>
        {/* Shimmer on hover */}
        <ShimmerBeam />

        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary/80" strokeWidth={1.5} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-1">{translatedName}</h3>
          <div className="flex items-end gap-1.5 mb-0.5">
            <span className="text-4xl font-extrabold text-white">${plan.price_usd}</span>
            <span className="text-sm text-white/50 mb-1.5">USD</span>
          </div>
          <p className="text-sm font-semibold text-primary/80">{plan.price_robux}+Tax R$</p>
        </div>

        <p className="text-sm font-semibold text-white/80 border-b border-white/5 pb-3">
          {t("pricing.includes")} {translatedFrames}
        </p>

        <div className="flex gap-3 -mt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3 h-3 text-cyan-500 flex-shrink-0" />
            {deliveryLabel}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
            <RefreshCw className="w-3 h-3 text-green-500 flex-shrink-0" />
            {revisionsCount < 0 ? t("pricing.unlimited") : `${revisionsCount} ${t("pricing.revisions")}`}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 flex-1">
          {translatedFeat.map((feature: string, fi: number) => (
            <motion.div
              key={fi}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + fi * 0.04, ...SPRING_SOFT }}
              className="flex items-center gap-2.5 text-sm"
            >
              <Check className="w-4 h-4 text-primary/70 shrink-0" strokeWidth={2.5} />
              <span className="text-white/70">{feature}</span>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={onSelect}
          className={`w-full mt-2 py-3 px-6 rounded-xl text-sm font-semibold border ${
            plan.featured
              ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
              : "bg-transparent border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          {t("pricing.goWith")}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Pricing Page ─────────────────────────────────────────────────────────

export default function Pricing() {
  const { t } = useLanguage();
  const [content, setContent]           = useState<PricingContent | null>(null);
  const [plans,   setPlans]             = useState<PricingPlanExtended[]>([]);
  const [faqs,    setFaqs]             = useState<FaqItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [openFaq, setOpenFaq]           = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanExtended | null>(null);
  const mountedRef = useRef(true);

  const whyChooseItems = [
    { icon: Bolt,          title: t("settings.perfBooster"), desc: t("pricing.hint") },
    { icon: MessageSquare, title: t("settings.contact"),     desc: t("cta.subtitle") },
    { icon: Layers,        title: t("portfolio.badge"),      desc: t("hero.subtitle") },
    { icon: Shield,        title: t("policies.badge"),       desc: t("policies.subtitle") },
  ];

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getContent("pricing") as PricingContent;
        if (!mountedRef.current) return;
        setContent(data);
        setPlans((data?.plans ?? []) as PricingPlanExtended[]);
      } catch {}
      try {
        const faqData = await getContent("faqs") as { items?: FaqItem[] };
        if (mountedRef.current) setFaqs(faqData?.items ?? []);
      } catch {}
      if (mountedRef.current) setLoading(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  useContentRealtime("pricing", async () => {
    if (!mountedRef.current) return;
    try {
      const data = await getContent("pricing") as PricingContent;
      if (mountedRef.current) { setContent(data); setPlans((data?.plans ?? []) as PricingPlanExtended[]); }
    } catch {}
  });

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SOFT}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20"
          >
            <DollarSign className="w-4 h-4" /> {t("pricing.badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...SPRING_SOFT }}
            className="text-4xl md:text-6xl font-bold font-display mb-5 text-primary text-balance"
          >
            {t("pricing.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...SPRING_SOFT }}
            className="text-muted-foreground max-w-2xl mx-auto text-base text-balance"
          >
            {t("pricing.subtitle")}
          </motion.p>
        </div>

        {/* Plan cards */}
        {loading ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={i}
                onSelect={() => setSelectedPlan(plan)}
              />
            ))}
          </div>
        )}

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-base text-muted-foreground/90 max-w-2xl mx-auto mb-20 font-medium text-balance"
        >
          {t("pricing.hint")}
        </motion.p>

        {/* Why Choose Me */}
        <div className="mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={SPRING_SOFT}
            className="text-2xl sm:text-3xl font-display font-bold text-center mb-10 text-white text-balance"
          >
            {t("pricing.whyTitle")}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyChooseItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  custom={i}
                  variants={whyVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  className="relative rounded-2xl border border-white/8 bg-background/60 backdrop-blur-md p-6 text-center overflow-hidden"
                >
                  <ShimmerBeam />
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-3">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-10">
              <motion.div
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={SPRING}
                className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mx-auto mb-4"
              >
                <ChevronDown className="w-5 h-5 text-primary" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={SPRING_SOFT}
                className="text-2xl sm:text-3xl font-display font-bold text-foreground text-balance"
              >
                {t("pricing.faqTitle")}
              </motion.h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq: FaqItem, i: number) => (
                <FaqAccordion
                  key={faq.id}
                  faq={faq}
                  index={i}
                  isOpen={openFaq === String(faq.id)}
                  onToggle={() =>
                    setOpenFaq(openFaq === String(faq.id) ? null : String(faq.id))
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Contact CTA — glassmorphic */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={SPRING_SOFT}
          className="relative overflow-hidden bg-background/60 backdrop-blur-xl border border-white/5 rounded-3xl p-12 text-center"
        >
          <ShimmerBeam rounded="rounded-3xl" />
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-display font-bold mb-4 text-white text-balance"
          >
            {t("pricing.stillQ")}
          </motion.h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base text-balance">
            {t("pricing.hint")}
          </p>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
          >
            <Button
              size="lg"
              className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
              onClick={() => openDiscord()}
            >
              <MessageSquare className="w-4 h-4" /> {t("pricing.contactDiscord")}
            </Button>
          </motion.div>
        </motion.div>

      </div>

      {selectedPlan && (
        <OrderModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  );
}
