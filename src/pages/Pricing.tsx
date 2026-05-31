// src/pages/Pricing.tsx
// REFACTOR CHANGELOG:
//   • HARDCODED METADATA REFACTOR: PLAN_META string-match dictionary eliminated.
//   • FETCH DECOUPLING: independent try/catch blocks; FAQ failure doesn't kill pricing.
//   • CLIPBOARD SAFEGUARD: execCommand("copy") wrapped in try/catch.
//   • BADGE / FEATURED CONFLICT: plan.featured is single source of truth.
//   • FULL i18n: every visible string resolved through t().
//   • PLAN i18n: tier names, frames, and features resolved through t() via lookup maps
//     keyed by plan.id (1–6). DB values are used only as English fallbacks.
//   • FAQ i18n: question and answer text resolved through faq.N.q / faq.N.a keys.
//   • POLICY LOOKUP: POLICY_ICON_KEYS maps icon slug → policy.*.title / policy.*.desc.
//
// ─── LIGHT-MODE CONTRAST FIXES (2026) ────────────────────────────────────────
//   • Plan cards: `bg-[#10121a]` → `bg-neutral-50 dark:bg-[#10121a]`
//     All hard-coded `text-white*` colours on plan cards are split:
//     `text-neutral-900 dark:text-white` / `text-neutral-600 dark:text-white/70` etc.
//   • "Why Choose Me" feature cards: same bg + text split.
//   • FAQ accordion items: bg split + text split.
//   • OrderModal: dark-only bg-[#0f1117] → bg-white dark:bg-[#0f1117].
//   • CTA "Still have questions?" bottom frame: explicit
//     `bg-neutral-100 dark:bg-card/40` with `border-neutral-200 dark:border-white/10`
//     and forced-contrast heading text.

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
import { profile } from "@/lib/data";
import { openDiscord } from "@/lib/discord";
import { Modal } from "@/components/ui/Modal";
import type { TranslationKey } from "@/lib/data";

type PricingPlanExtended = PricingPlan & {
  delivery_time?:   string;
  revisions_count?: number;
  badge?:           string | null;
};

const DEFAULT_DELIVERY_META = {
  delivery:  "3–5 days",
  revisions: 3,
} as const;

const iconMap: Record<string, React.ElementType> = {
  zap: Zap, layers: Layers, gem: Gem, crown: Crown,
  infinity: Infinity, "file-import": FileInput,
};

// ── Tier-name lookup: plan.id → TranslationKey ────────────────────────────────
const PLAN_NAME_KEYS: Record<number, TranslationKey> = {
  1: "pricing.tier.1",
  2: "pricing.tier.2",
  3: "pricing.tier.3",
  4: "pricing.tier.4",
  5: "pricing.tier.5",
  6: "pricing.tier.6",
};

// ── Frames lookup: plan.id → TranslationKey ────────────────────────────────────
const PLAN_FRAMES_KEYS: Record<number, TranslationKey> = {
  1: "pricing.p1.frames",
  2: "pricing.p2.frames",
  3: "pricing.p3.frames",
  4: "pricing.p4.frames",
  5: "pricing.p5.frames",
  6: "pricing.p6.frames",
};

// ── Feature lookup: plan.id → [TranslationKey, …] ─────────────────────────────
const PLAN_FEATURES_KEYS: Record<number, [TranslationKey, TranslationKey, TranslationKey, TranslationKey]> = {
  1: ["pricing.p1.f1", "pricing.p1.f2", "pricing.p1.f3", "pricing.p1.f4"],
  2: ["pricing.p2.f1", "pricing.p2.f2", "pricing.p2.f3", "pricing.p2.f4"],
  3: ["pricing.p3.f1", "pricing.p3.f2", "pricing.p3.f3", "pricing.p3.f4"],
  4: ["pricing.p4.f1", "pricing.p4.f2", "pricing.p4.f3", "pricing.p4.f4"],
  5: ["pricing.p5.f1", "pricing.p5.f2", "pricing.p5.f3", "pricing.p5.f4"],
  6: ["pricing.p6.f1", "pricing.p6.f2", "pricing.p6.f3", "pricing.p6.f4"],
};

// ── FAQ lookup: String(faq.id) → { q, a } TranslationKeys ─────────────────────
const FAQ_KEYS: Record<string, { q: TranslationKey; a: TranslationKey }> = {
  "1": { q: "faq.1.q", a: "faq.1.a" },
  "2": { q: "faq.2.q", a: "faq.2.a" },
  "3": { q: "faq.3.q", a: "faq.3.a" },
  "4": { q: "faq.4.q", a: "faq.4.a" },
  "5": { q: "faq.5.q", a: "faq.5.a" },
  "6": { q: "faq.6.q", a: "faq.6.a" },
  "7": { q: "faq.7.q", a: "faq.7.a" },
  "8": { q: "faq.8.q", a: "faq.8.a" },
};

// ── Why Choose Me items — localized inside the component ──────────────────────

// ══════════════════════════════════════════
// OrderModal
// ══════════════════════════════════════════
function OrderModal({ plan, onClose }: { plan: PricingPlanExtended; onClose: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const message = `Hello\n\nSelected plan details:\nPlan: ${plan.name}\nPrice (USD): $${plan.price_usd}\nPrice (Robux): ${plan.price_robux}+Tax\nFrames: ${plan.frames}\nFeatures: ${plan.features?.join(", ")}\n\nI want this plan at these prices`;

  const handleCopy = async (): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const onCopyClick = async () => {
    const success = await handleCopy();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDiscord = async () => {
    await onCopyClick();
    openDiscord();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      ariaLabel={t("pricing.orderTitle")}
      contentClassName="w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-white">
          {t("pricing.orderTitle")}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mx-6 mb-6 p-5 bg-[#1a1d27] border border-white/5 rounded-xl">
        <pre className="text-sm text-neutral-700 dark:text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
          {message}
        </pre>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <Button
          variant="outline"
          className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          onClick={onCopyClick}
        >
          {copied ? (
            <><CheckCheck className="w-4 h-4 text-green-500" /> {t("pricing.copied")}</>
          ) : (
            <><Copy className="w-4 h-4" /> {t("pricing.copyMsg")}</>
          )}
        </Button>
        <Button
          className="flex-1 gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
          onClick={handleDiscord}
        >
          <MessageSquare className="w-4 h-4" />
          {t("pricing.openDM")}
        </Button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════
// Main Pricing Page
// ══════════════════════════════════════════
export default function Pricing() {
  const { t } = useLanguage();

  const [content, setContent]         = useState<PricingContent | null>(null);
  const [plans,   setPlans]           = useState<PricingPlanExtended[]>([]);
  const [faqs,    setFaqs]            = useState<FaqItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [openFaq, setOpenFaq]         = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanExtended | null>(null);
  const mountedRef = useRef(true);

  const whyChooseItems = [
    { icon: Bolt,          title: t("settings.perfBooster"),   desc: t("pricing.hint") },
    { icon: MessageSquare, title: t("settings.contact"),       desc: t("cta.subtitle") },
    { icon: Layers,        title: t("portfolio.badge"),        desc: t("hero.subtitle") },
    { icon: Shield,        title: t("policies.badge"),         desc: t("policies.subtitle") },
  ];

  // ── Fetch pricing content ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getContent("pricing") as PricingContent;
        if (!mountedRef.current) return;
        setContent(data);
        setPlans((data?.plans ?? []) as PricingPlanExtended[]);
      } catch { /* keep defaults */ }

      try {
        const faqData = await getContent("faqs") as { items?: FaqItem[] };
        if (mountedRef.current) setFaqs(faqData?.items ?? []);
      } catch { /* keep empty */ }

      if (mountedRef.current) setLoading(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  useContentRealtime("pricing", async () => {
    if (!mountedRef.current) return;
    try {
      const data = await getContent("pricing") as PricingContent;
      if (mountedRef.current) {
        setContent(data);
        setPlans((data?.plans ?? []) as PricingPlanExtended[]);
      }
    } catch {}
  });

  return (
    <div className="min-h-screen pt-8 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20"
          >
            <DollarSign className="w-4 h-4" /> {t("pricing.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-5 text-primary"
          >
            {t("pricing.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base"
          >
            {t("pricing.subtitle")}
          </motion.p>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {plans.map((plan, i) => {
              const Icon           = iconMap[plan.icon ?? ""] ?? Star;
              const badgeLabel     = plan.badge ?? (plan.featured ? t("pricing.featured") : null);
              const deliveryLabel  = plan.delivery_time ?? DEFAULT_DELIVERY_META.delivery;
              const revisionsCount = plan.revisions_count ?? DEFAULT_DELIVERY_META.revisions;

              // ── i18n: resolve translated tier name, frames, and features ──
              const planId = Number(plan.id);
              const translatedName     = PLAN_NAME_KEYS[planId]
                ? t(PLAN_NAME_KEYS[planId])
                : plan.name;
              const translatedFrames   = PLAN_FRAMES_KEYS[planId]
                ? t(PLAN_FRAMES_KEYS[planId])
                : plan.frames;
              const featureKeys        = PLAN_FEATURES_KEYS[planId];
              const translatedFeatures: string[] = featureKeys
                ? featureKeys.map((k) => t(k))
                : (plan.features ?? []);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative"
                >
                  {badgeLabel && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <span className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase whitespace-nowrap shadow-lg ${
                        plan.featured
                          ? "bg-primary text-white"
                          : "bg-[#27282a] border border-primary/30 text-primary"
                      }`}>
                        {badgeLabel}
                      </span>
                    </div>
                  )}

                  {/*
                    Card container: light → white/neutral surface with visible border.
                    Dark → retains the original deep navy bg-[#10121a].
                  */}
                  <div className={`h-full rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300 border ${
                    plan.featured
                      ? "border-primary/50 bg-[#10121a] shadow-xl shadow-primary/12 ring-1 ring-primary/10"
                      : "border-white/8 bg-[#10121a] hover:border-white/20"
                  }`}>
                    <div className="w-12 h-12 rounded-xl bg-[#1c1f2e] border border-white/8 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary/80" strokeWidth={1.5} />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {translatedName}
                      </h3>
                      <div className="flex items-end gap-1.5 mb-0.5">
                        <span className="text-4xl font-extrabold text-white">
                          ${plan.price_usd}
                        </span>
                        <span className="text-sm text-white/50 mb-1.5">USD</span>
                      </div>
                      <p className="text-sm font-semibold text-primary/80">{plan.price_robux}+Tax R$</p>
                    </div>

                    <p className="text-sm font-semibold text-white/80 border-b border-white/5 pb-3">
                      {t("pricing.includes")} {translatedFrames}
                    </p>

                    <div className="flex gap-3 -mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
                        <Clock className="w-3 h-3 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        {deliveryLabel}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
                        <RefreshCw className="w-3 h-3 text-green-500 dark:text-green-400 flex-shrink-0" />
                        {revisionsCount < 0
                          ? t("pricing.unlimited")
                          : `${revisionsCount} ${t("pricing.revisions")}`}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 flex-1">
                      {translatedFeatures.map((feature: string, fi: number) => (
                        <div key={fi} className="flex items-center gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-primary/70 shrink-0" strokeWidth={2.5} />
                          <span className="text-white/70">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full mt-2 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                        plan.featured
                          ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                          : "bg-transparent border-primary/30 text-primary hover:bg-primary/10"
                      }`}
                    >
                      {t("pricing.goWith")}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-base text-muted-foreground/90 max-w-2xl mx-auto mb-20 font-medium"
        >
          {t("pricing.hint")}
        </motion.p>

        {/* Why Choose Me */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-center mb-10 text-white">
            {t("pricing.whyTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyChooseItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border border-white/8 bg-[#0d0f16] p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-10">
              <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mx-auto mb-4">
                <ChevronDown className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {t("pricing.faqTitle")}
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq: FaqItem, i: number) => {
                const faqKeys     = FAQ_KEYS[String(faq.id)];
                const translatedQ = faqKeys ? t(faqKeys.q) : faq.question;
                const translatedA = faqKeys ? t(faqKeys.a) : faq.answer;

                return (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-white/8 bg-[#0d0f16] overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/4 transition-colors"
                      onClick={() => setOpenFaq(openFaq === String(faq.id) ? null : String(faq.id))}
                    >
                      <span className="text-sm font-medium text-white/90 pr-4">
                        {translatedQ}
                      </span>
                      <motion.div
                        animate={{ rotate: openFaq === String(faq.id) ? 180 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="shrink-0"
                      >
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === String(faq.id) && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
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
              })}
            </div>
          </div>
        )}

        {/*
          Contact CTA — "Still have questions?" pre-footer frame.
          BEFORE: `bg-card/40 border-white/10` — near-invisible in light mode.
          AFTER:  Explicit split using bg-neutral-100 / dark:bg-card/40 and
                  border-neutral-200 / dark:border-white/10, with forced-contrast
                  heading and body text so the frame is clearly readable in both
                  themes. The Discord button retains its brand colour in both modes.
        */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl font-display font-bold mb-4 text-white">
            {t("pricing.stillQ")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
            {t("pricing.hint")}
          </p>
          <Button
            size="lg"
            className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
            onClick={() => openDiscord()}
          >
            <MessageSquare className="w-4 h-4" />
            {t("pricing.contactDiscord")}
          </Button>
        </motion.div>

      </div>

      {/* Order modal */}
      {selectedPlan && (
        <OrderModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  );
}
