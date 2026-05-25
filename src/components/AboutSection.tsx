// src/components/AboutSection.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  All strings are now resolved via the centralized t() function from
//  useLanguage(). The local ABOUT_STRINGS dictionary and Language import
//  have been completely removed. All about.* keys live in data.ts and are
//  shared with the rest of the app's translation pipeline.

import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

export function AboutSection() {
  const { t } = useLanguage();

  const offers  = [t("about.offer1"), t("about.offer2"), t("about.offer3"), t("about.offer4"), t("about.offer5"), t("about.offer6")];
  const reasons = [t("about.why1"), t("about.why2"), t("about.why3"), t("about.why4")];
  const rates   = [
    { label: t("about.rate1Label"), price: t("about.rate1Price") },
    { label: t("about.rate2Label"), price: t("about.rate2Price") },
  ];
  const skills  = [t("about.skill1"), t("about.skill2"), t("about.skill3"), t("about.skill4")];

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24 relative z-10">

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
          {t("about.badge")}
        </span>
        <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
          {t("about.title")}
        </h2>
        <motion.div
          className="w-20 h-1.5 bg-primary rounded-full mx-auto"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 md:p-12 space-y-8"
      >

        {/* Intro */}
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          {t("about.intro")}
        </p>

        {/* Two-column: Offer + Why */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🎨</span>
              {t("about.offerTitle")}
            </h3>
            <ul className="space-y-2">
              {offers.map((offer, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.4 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {offer}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">✅</span>
              {t("about.whyTitle")}
            </h3>
            <ul className="space-y-2">
              {reasons.map((reason, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {reason}
                </motion.li>
              ))}
            </ul>
          </motion.div>

        </div>

        {/* Rates */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">💰</span>
            {t("about.ratesTitle")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rates.map((rate, i) => (
              <div key={i} className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{rate.label}</p>
                <p className="text-sm text-foreground font-semibold">{rate.price}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment + Delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">
              <span className="mr-1.5" aria-hidden="true">💳</span>
              {t("about.paymentTitle")}
            </p>
            <p className="leading-relaxed">{t("about.payment")}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">
              <span className="mr-1.5" aria-hidden="true">📦</span>
              {t("about.deliveryTitle")}
            </p>
            <p className="leading-relaxed">{t("about.delivery")}</p>
          </div>
        </div>

        {/* CTA */}
        <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed border-t border-white/5 pt-6">
          <span className="mr-1.5" aria-hidden="true">🚀</span>
          {t("about.cta")}
        </p>

        {/* Skill badges */}
        <div className="flex flex-wrap gap-3 pt-2">
          {skills.map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
            >
              {skill}
            </motion.span>
          ))}
        </div>

      </motion.div>
    </section>
  );
}
