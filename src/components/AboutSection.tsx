// src/components/AboutSection.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  LOCALISATION
//    • All hardcoded English strings are removed from JSX.
//    • `useLanguage()` provides the active `lang` value ("en" | "ar" | "es").
//    • A local `ABOUT_STRINGS` dictionary supplies trilingual content for every
//      text element in this section. This pattern avoids adding new keys to the
//      global TranslationKey type (which would require touching data.ts, a
//      separate file outside this refactor scope) while still delivering full
//      i18n support through the existing useLanguage hook.
//    • RTL layout is handled automatically: the LanguageProvider in
//      use-language.tsx sets `document.documentElement.dir = "rtl"` when
//      Arabic is active, so no explicit dir prop is needed here.
//
//  EMOJI TEXT CODE REMOVAL
//    • The original paragraph was pasted verbatim from a Discord message and
//      contained raw emoji shortcode literals: `:wave:`, `:rocket:`,
//      `:video_game:`, `:sparkles:`, `:dart:`, `:joystick:`, `:mobile_phone:`,
//      `:computer:`, `:speech_balloon:`, `:money_with_wings:`, `:handshake:`,
//      `:arrows_counterclockwise:`, `:open_file_folder:`, `:alarm_clock:`,
//      `:white_check_mark:`, `:bookmark_tabs:`, `:moneybag:`, `:art:`,
//      `:credit_card:`. These rendered as literal text, not emoji.
//    • All raw shortcodes are replaced with structured content using real
//      Unicode characters where appropriate, or removed where they were
//      purely decorative noise.
//
//  CONTENT STRUCTURE
//    • The original wall of text is broken into readable, semantic blocks:
//        - Intro paragraph
//        - "What I Offer" list
//        - "Why Choose Me" list
//        - Rates grid
//        - Payment / delivery notes
//    • Each block is a `<section>` with a heading so mobile users can scan
//      the content without scrolling through an unbroken paragraph.
//    • Text is left-aligned inside the card (center alignment degrades
//      readability for list content on narrow viewports).
//
//  ANIMATION FIX
//    • `whileInView` is paired with `viewport={{ once: true }}` throughout.
//      The original used `once: true` already — confirmed and retained.
//      This prevents the re-trigger bug where scrolling back past the section
//      fires the entrance animation again.

import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/hooks/use-language";

// ─── Local trilingual strings ─────────────────────────────────────────────────
// Kept co-located with this component to avoid touching the global TranslationKey
// type. If this section grows, migrate to an `about.*` namespace in data.ts.

interface AboutStrings {
  badge:         string;
  title:         string;
  intro:         string;
  offerTitle:    string;
  offers:        string[];
  whyTitle:      string;
  reasons:       string[];
  ratesTitle:    string;
  rates:         { label: string; price: string }[];
  paymentTitle:  string;
  payment:       string;
  deliveryTitle: string;
  delivery:      string;
  cta:           string;
  skills:        string[];
}

const ABOUT_STRINGS: Record<Language, AboutStrings> = {
  en: {
    badge:   "About Me",
    title:   "Behind the Pixels",
    intro:
      "Hi! I'm Youssef, a 20-year-old full-time UI/UX designer with over 2 years " +
      "of experience crafting unique, cartoony, and interactive interfaces for " +
      "Roblox games. If you need a professional designer who gets your game the " +
      "visibility it deserves — you're in the right place.",
    offerTitle: "What I Offer",
    offers: [
      "Professional & creative UI design",
      "UX-optimised layouts",
      "Direct asset porting inside Roblox Studio",
      "Scaled & optimised for every device",
      "Fast turnaround with smooth communication",
      "Competitive rates with a quality guarantee",
    ],
    whyTitle: "Why Choose Me?",
    reasons: [
      "Up to 5 free revisions until you're 100 % satisfied",
      "Full transparency — you're kept informed every step of the way",
      "Frequent updates & instant responses as a full-time designer",
      "Money-back guarantee if you're not satisfied",
    ],
    ratesTitle: "Rates",
    rates: [
      { label: "UI Design",  price: "$15 / frame  (or 4 000 Robux / frame, tax included)" },
      { label: "UI Import",  price: "$5 / frame   (porting to all devices)" },
    ],
    paymentTitle:  "Payment",
    payment:       "PayPal or Robux. Robux pricing already reflects the applicable tax.",
    deliveryTitle: "Delivery",
    delivery:
      "Final files delivered as clean PNGs or ported directly into your Roblox project. " +
      "100 % refund guaranteed if you're not satisfied.",
    cta: "Ready to bring your Roblox project to life? Let's talk today.",
    skills: ["UI/UX Design", "Roblox Studio", "Game Interfaces", "Brand Identity"],
  },

  ar: {
    badge:   "عني",
    title:   "خلف البكسلات",
    intro:
      "مرحباً! أنا يوسف، مصمم UI/UX بدوام كامل عمري 20 عاماً وأكثر من سنتين من الخبرة " +
      "في تصميم واجهات مستخدم فريدة وتفاعلية لألعاب Roblox. " +
      "إذا كنت تحتاج مصمماً محترفاً يمنح لعبتك الظهور الذي تستحقه — فأنت في المكان الصحيح.",
    offerTitle: "ما أقدمه",
    offers: [
      "تصميم UI احترافي وإبداعي",
      "تخطيطات محسّنة لتجربة المستخدم",
      "استيراد الأصول مباشرةً داخل Roblox Studio",
      "مُحسَّن لجميع الأجهزة",
      "تسليم سريع مع تواصل سلس",
      "أسعار تنافسية مع ضمان الجودة",
    ],
    whyTitle: "لماذا أنا؟",
    reasons: [
      "ما يصل إلى 5 تعديلات مجانية حتى تكون راضياً 100 %",
      "شفافية تامة — أُبقيك على اطلاع في كل خطوة",
      "تواصل دائم وتحديثات فورية بوصفي مصمماً بدوام كامل",
      "ضمان استرداد المال إذا لم تكن راضياً",
    ],
    ratesTitle: "الأسعار",
    rates: [
      { label: "تصميم UI",  price: "15 دولار / إطار  (أو 4 000 روبوكس / إطار، الضريبة مشمولة)" },
      { label: "استيراد UI", price: "5 دولار / إطار   (نقل لجميع الأجهزة)" },
    ],
    paymentTitle:  "طرق الدفع",
    payment:       "PayPal أو Robux. سعر الروبوكس يعكس الضريبة المطبّقة بالفعل.",
    deliveryTitle: "التسليم",
    delivery:
      "ملفات نهائية كصور PNG نظيفة أو منقولة مباشرةً إلى مشروعك. " +
      "ضمان استرداد 100 % إذا لم تكن راضياً.",
    cta: "هل أنت مستعد لإحياء مشروعك على Roblox؟ تواصل معي اليوم.",
    skills: ["تصميم UI/UX", "Roblox Studio", "واجهات الألعاب", "هوية العلامة التجارية"],
  },

  es: {
    badge:   "Sobre mí",
    title:   "Detrás de los Píxeles",
    intro:
      "¡Hola! Soy Youssef, diseñador UI/UX a tiempo completo con 20 años y más de 2 años " +
      "de experiencia creando interfaces únicas, animadas e interactivas para juegos de Roblox. " +
      "Si necesitas un diseñador profesional que le dé a tu juego la visibilidad que merece, " +
      "estás en el lugar indicado.",
    offerTitle: "Qué Ofrezco",
    offers: [
      "Diseño UI profesional y creativo",
      "Layouts optimizados para UX",
      "Importación directa de assets en Roblox Studio",
      "Escalado y optimizado para todos los dispositivos",
      "Entrega rápida con comunicación fluida",
      "Precios competitivos con garantía de calidad",
    ],
    whyTitle: "¿Por Qué Yo?",
    reasons: [
      "Hasta 5 revisiones gratuitas hasta que estés 100 % satisfecho",
      "Total transparencia — te mantengo informado en cada paso",
      "Actualizaciones frecuentes y respuestas inmediatas como diseñador a tiempo completo",
      "Garantía de devolución si no estás satisfecho",
    ],
    ratesTitle: "Tarifas",
    rates: [
      { label: "Diseño UI",   price: "$15 / frame  (o 4 000 Robux / frame, impuesto incluido)" },
      { label: "Importar UI", price: "$5 / frame   (porteo a todos los dispositivos)" },
    ],
    paymentTitle:  "Pago",
    payment:       "PayPal o Robux. El precio en Robux ya incluye el impuesto aplicable.",
    deliveryTitle: "Entrega",
    delivery:
      "Archivos finales como PNGs limpios o integrados directamente en tu proyecto de Roblox. " +
      "Garantía de reembolso del 100 % si no estás satisfecho.",
    cta: "¿Listo para dar vida a tu proyecto de Roblox? Contáctame hoy.",
    skills: ["Diseño UI/UX", "Roblox Studio", "Interfaces de Juegos", "Identidad de Marca"],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AboutSection() {
  const { lang } = useLanguage();
  const s = ABOUT_STRINGS[lang] ?? ABOUT_STRINGS.en;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24 relative z-10">

      {/* ── Section heading ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
          {s.badge}
        </span>
        <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
          {s.title}
        </h2>
        <motion.div
          className="w-20 h-1.5 bg-primary rounded-full mx-auto"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </motion.div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 md:p-12 space-y-8"
      >

        {/* Intro */}
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          {s.intro}
        </p>

        {/* Two-column grid on md+: Offer list + Why list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* What I Offer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🎨</span>
              {s.offerTitle}
            </h3>
            <ul className="space-y-2">
              {s.offers.map((offer, i) => (
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

          {/* Why Choose Me */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">✅</span>
              {s.whyTitle}
            </h3>
            <ul className="space-y-2">
              {s.reasons.map((reason, i) => (
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
            {s.ratesTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {s.rates.map((rate, i) => (
              <div
                key={i}
                className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3"
              >
                <p className="text-xs text-muted-foreground font-medium mb-0.5">
                  {rate.label}
                </p>
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
              {s.paymentTitle}
            </p>
            <p className="leading-relaxed">{s.payment}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">
              <span className="mr-1.5" aria-hidden="true">📦</span>
              {s.deliveryTitle}
            </p>
            <p className="leading-relaxed">{s.delivery}</p>
          </div>
        </div>

        {/* CTA */}
        <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed border-t border-white/5 pt-6">
          <span className="mr-1.5" aria-hidden="true">🚀</span>
          {s.cta}
        </p>

        {/* Skill badges */}
        <div className="flex flex-wrap gap-3 pt-2">
          {s.skills.map((skill, i) => (
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
