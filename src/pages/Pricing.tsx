// src/pages/Pricing.tsx
// REFACTOR CHANGELOG:
//   • HARDCODED METADATA REFACTOR: PLAN_META string-match dictionary eliminated.
//     PricingPlan is extended with optional delivery_time and revisions_count fields
//     that map directly from the Supabase payload. When those fields are present on the
//     plan object they are used; a compact DEFAULT_DELIVERY_META fallback applies only
//     when the DB row is missing them. Admin renames no longer break delivery/revision
//     display because the source of truth is the row data, not the plan name.
//   • FETCH DECOUPLING: Promise.all replaced with two independent try/catch blocks.
//     A FAQ endpoint failure no longer silently crashes the pricing schema load.
//   • CLIPBOARD SAFEGUARD: execCommand("copy") fallback now wraps document access in
//     a try/catch that silently swallows failures in sandboxed iframes or non-HTTPS
//     contexts. The UI degrades gracefully (no copy confirmation) without throwing.
//   • BADGE / FEATURED CONFLICT: plan.featured is the single source of truth for the
//     highlight ring + CTA button style. The optional badge label reads from plan.badge
//     (a DB field) with plan.featured producing "Featured" as a final fallback.
//     There is no longer a parallel PLAN_META.badge that could diverge from the DB.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Check, Star, Zap, Layers, Gem, Crown,
  Infinity, FileInput, MessageSquare, ChevronDown, X,
  Copy, CheckCheck, Bolt, RefreshCw, Clock, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PricingContent, PricingPlan, FaqItem } from "@/lib/contentManager";
import { useContentRealtime } from "@/hooks/useContentRealtime";
import { profile } from "@/lib/data";
import { openDiscord } from "@/lib/discord";
import { Modal } from "@/components/ui/Modal";

// ── PricingPlan type augmentation ──────────────────────────────────────────────
//
// The upstream PricingPlan interface lives in contentManager. These two fields are
// added by database migration and may be absent on legacy rows — hence optional.
// When present they override the generic fallback below.
//
type PricingPlanExtended = PricingPlan & {
  delivery_time?:   string;   // e.g. "3–5 days"
  revisions_count?: number;   // -1 = unlimited
  badge?:           string | null;
};

// ── Fallback delivery metadata ─────────────────────────────────────────────────
//
// Applied only when a plan row has no delivery_time / revisions_count fields.
// This is a last-resort default, NOT a name-keyed lookup.
//
const DEFAULT_DELIVERY_META = {
  delivery:  "3–5 days",
  revisions: 3,
} as const;

// ── Icon map ───────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  zap: Zap, layers: Layers, gem: Gem, crown: Crown,
  infinity: Infinity, "file-import": FileInput,
};

// ── Why Choose Me items ────────────────────────────────────────────────────────
const whyChooseItems = [
  { icon: Bolt,         title: "Free Revisions",       desc: "Up to 5 free revisions depending on your plan to ensure perfection." },
  { icon: MessageSquare,title: "Clear Communication",  desc: "I keep you updated throughout the entire design process." },
  { icon: Layers,       title: "Full-Time Designer",   desc: "Dedicated to UI/UX design, providing reliable and professional service." },
  { icon: Shield,       title: "Money Back Guarantee", desc: "Risk-free service with clear refund policies if expectations aren't met." },
];

// ══════════════════════════════════════════
// OrderModal — clipboard safeguard
// ══════════════════════════════════════════
function OrderModal({
  plan,
  onClose,
}: {
  plan:    PricingPlanExtended;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const message = `Hello

Selected plan details:
Plan: ${plan.name}
Price (USD): $${plan.price_usd}
Price (Robux): ${plan.price_robux}+Tax
Frames: ${plan.frames}
Features: ${plan.features?.join(", ")}

I want this plan at these prices`;

  // ── Safe clipboard write ───────────────────────────────────────────────
  //
  // Priority chain:
  //   1. navigator.clipboard.writeText — modern, requires HTTPS + user gesture
  //   2. document.execCommand("copy")  — legacy; may throw in sandboxed iframes
  //      or when the document does not have focus. Wrapped in try/catch so it
  //      fails silently rather than crashing the component.
  //
  const handleCopy = async (): Promise<boolean> => {
    // Attempt 1: Clipboard API (HTTPS + secure contexts)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        return true;
      }
    } catch {
      // Clipboard API rejected — fall through to execCommand
    }

    // Attempt 2: Legacy execCommand — may be unsupported or blocked in sandboxes
    try {
      const ta = document.createElement("textarea");
      ta.value          = message;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      // execCommand not available (iframe sandbox, etc.) — degrade silently
      return false;
    }
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
      ariaLabel="Order message"
      contentClassName="w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-white">Order Message</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message box */}
      <div className="mx-6 mb-6 p-5 bg-[#1a1d27] border border-white/5 rounded-xl">
        <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
          {message}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-6 pb-6">
        <Button
          variant="outline"
          className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
          onClick={onCopyClick}
        >
          {copied ? (
            <><CheckCheck className="w-4 h-4 text-green-400" /> Copied!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy Message</>
          )}
        </Button>
        <Button
          className="flex-1 gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
          onClick={handleDiscord}
        >
          <MessageSquare className="w-4 h-4" />
          Open Discord DM
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
  const [loading, setLoading]         = useState(true);
  const [openFaq, setOpenFaq]         = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanExtended | null>(null);
  const [faqs, setFaqs]               = useState<FaqItem[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── DECOUPLED DATA FETCH ───────────────────────────────────────────────
  //
  // Previously a Promise.all meant that a failed FAQ fetch crashed the entire
  // pricing page silently. Each endpoint is now wrapped in its own try/catch
  // so a fault in one dataset does not affect the other.
  //
  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      try {
        const pricingData = await getContent("pricing");
        if (mountedRef.current && !cancelled) setContent(pricingData);
      } catch {
        // FAQ failure must not block pricing display — content stays null.
      }
    };

    const loadFaqs = async () => {
      try {
        const faqData = await getContent("faqs");
        if (mountedRef.current && !cancelled) {
          setFaqs(faqData?.items?.filter((f: FaqItem) => f.is_published !== false) ?? []);
        }
      } catch {
        // Pricing failure must not block FAQ display — faqs stay empty.
      }
    };

    const loadAll = async () => {
      // Fire both concurrently but each handles its own error independently.
      await Promise.allSettled([loadPricing(), loadFaqs()]);
      if (mountedRef.current && !cancelled) setLoading(false);
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // ── Live updates ───────────────────────────────────────────────────────
  useContentRealtime("pricing", async () => {
    if (!mountedRef.current) return;
    try {
      const data = await getContent("pricing");
      if (mountedRef.current) setContent(data);
    } catch { /* ignore */ }
  });

  useContentRealtime("faqs", async () => {
    if (!mountedRef.current) return;
    try {
      const data = await getContent("faqs");
      if (mountedRef.current)
        setFaqs(data?.items?.filter((f: FaqItem) => f.is_published !== false) ?? []);
    } catch {}
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const plans = (content?.plans?.filter((p) => p.is_published !== false) ?? []) as PricingPlanExtended[];

  return (
    <div className="min-h-screen pt-8 pb-20 px-6">
      {/* Order Modal */}
      {selectedPlan && (
        <OrderModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <DollarSign className="w-4 h-4" />
            {t("pricing.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent"
          >
            {t("pricing.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t("pricing.subtitle")}
          </motion.p>
        </div>

        {/* Why Choose Me */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-3 text-foreground">
            Why Choose Me?
          </h2>
          <div className="flex justify-center mb-10">
            <div className="w-16 h-1 rounded-full bg-primary/70" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyChooseItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center text-center p-7 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-primary/80" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 max-w-3xl mx-auto"
        >
          <div className="w-5 h-5 shrink-0 mt-0.5 rounded-full border border-primary/60 flex items-center justify-center text-primary text-xs font-bold">
            i
          </div>
          <p className="text-sm text-primary/80 dark:text-blue-300/90">
            When you click "Go with this plan", a pop-up will appear with a ready message. Copy it exactly and send it to me in Discord DM.
          </p>
        </motion.div>

        {/* Pricing Plans */}
        {plans.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Pricing plans coming soon...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {plans.map((plan: PricingPlanExtended, i: number) => {
              const Icon = iconMap[plan.icon || ""] || Zap;

              // ── DB-driven delivery & revisions ──────────────────────────
              // Use plan.delivery_time / plan.revisions_count if populated by
              // the DB migration; fall back to DEFAULT_DELIVERY_META otherwise.
              // This completely removes the fragile name-match dependency.
              const deliveryLabel   = plan.delivery_time   ?? DEFAULT_DELIVERY_META.delivery;
              const revisionsCount  = plan.revisions_count ?? DEFAULT_DELIVERY_META.revisions;

              // ── Badge label: DB field > featured flag > null ────────────
              // plan.badge is the DB-sourced label (e.g. "Most Popular").
              // plan.featured makes the card highlighted. The two are now
              // independent: a plan can be highlighted without a badge label
              // and vice versa. No PLAN_META can shadow either field.
              const badgeLabel = plan.badge ?? (plan.featured ? "Featured" : null);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative"
                >
                  {/* Badge */}
                  {badgeLabel && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <span
                        className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase whitespace-nowrap shadow-lg ${
                          plan.featured
                            ? "bg-gradient-to-r from-primary to-indigo-500 text-white"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  )}

                  <div
                    className={`h-full rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300 border ${
                      plan.featured
                        ? "border-primary/50 bg-[#10121a] shadow-xl shadow-primary/12 ring-1 ring-primary/10"
                        : "border-white/8 bg-[#10121a] hover:border-white/20"
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#1c1f2e] border border-white/8 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary/80" strokeWidth={1.5} />
                    </div>

                    {/* Name + price */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                      <div className="flex items-end gap-1.5 mb-0.5">
                        <span className="text-4xl font-extrabold text-white">${plan.price_usd}</span>
                        <span className="text-sm text-white/50 mb-1.5">USD</span>
                      </div>
                      <p className="text-sm font-semibold text-primary/80">{plan.price_robux}+Tax R$</p>
                    </div>

                    {/* Frames */}
                    <p className="text-sm font-semibold text-white/80 border-b border-white/5 pb-3">
                      Includes: {plan.frames}
                    </p>

                    {/* Delivery & revisions — DB-driven, no name lookup */}
                    <div className="flex gap-3 -mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
                        <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        {deliveryLabel}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/50 bg-white/4 border border-white/6 rounded-lg px-2.5 py-1.5">
                        <RefreshCw className="w-3 h-3 text-green-400 flex-shrink-0" />
                        {revisionsCount < 0 ? "Unlimited" : `${revisionsCount} revisions`}
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="flex flex-col gap-2.5 flex-1">
                      {plan.features?.map((feature: string, fi: number) => (
                        <div key={fi} className="flex items-center gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-primary/70 shrink-0" strokeWidth={2.5} />
                          <span className="text-white/70">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full mt-2 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                        plan.featured
                          ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                          : "bg-transparent border-primary/30 text-primary hover:bg-primary/10"
                      }`}
                    >
                      Go with this plan
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

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-10">
              <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mx-auto mb-4">
                <ChevronDown className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq: FaqItem, i: number) => (
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
                    onClick={() =>
                      setOpenFaq(openFaq === String(faq.id) ? null : String(faq.id))
                    }
                  >
                    <span className="text-sm font-medium text-white/90 pr-4">
                      {faq.question}
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
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl font-display font-bold mb-4">
            {t("pricing.stillQ")}
          </h2>
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
    </div>
  );
}
