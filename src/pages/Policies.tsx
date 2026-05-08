import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  RefreshCcw,
  Clock,
  DollarSign,
  MessageSquare,
  Lock,
  Code,
  AlertTriangle,
  Sparkles,
  FileText,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getContent, PoliciesContent } from "@/lib/contentManager";
import { profile } from "@/lib/data";
import { openDiscordProfile } from "@/lib/discord";

const policyIcons: Record<string, React.ElementType> = {
  shield: Shield,
  refresh: RefreshCcw,
  clock: Clock,
  "dollar-sign": DollarSign,
  "message-square": MessageSquare,
  lock: Lock,
  code: Code,
  alert: AlertTriangle,
  sparkles: Sparkles,
  scale: Scale,
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export default function Policies() {
  const { t } = useLanguage();
  const [content, setContent] = useState<PoliciesContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getContent("policies");
      setContent(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  const policies =
    content?.policies?.filter((p) => p.is_published !== false) || [];

  return (
    <div className="min-h-screen pt-8 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-400 text-sm font-semibold mb-6 border border-red-500/20"
          >
            <Scale className="w-4 h-4" />
            {t("policies.badge")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-red-500 via-rose-400 to-orange-400 bg-clip-text text-transparent"
          >
            {t("policies.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t("policies.subtitle")}
          </motion.p>
          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-24 h-1 bg-gradient-to-r from-red-500 to-orange-400 rounded-full mx-auto mt-6"
          />
        </div>

        {/* Policies Grid - 2 columns */}
        {policies.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-2xl border border-red-500/10">
            <FileText className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("policies.noPolicies")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {policies.map((policy, i) => {
              const Icon = policyIcons[policy.icon] || Shield;
              return (
                <motion.div
                  key={policy.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="group relative rounded-2xl bg-card/40 backdrop-blur-xl border border-red-500/10 hover:border-red-500/30 p-6 md:p-7 transition-all duration-300 overflow-hidden"
                >
                  {/* Red glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
                    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-red-500/5 to-transparent rotate-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  </div>

                  <div className="relative flex items-start gap-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                      className="shrink-0 w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
                    >
                      <Icon className="w-5 h-5 text-red-400" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold font-display mb-2 text-red-50 group-hover:text-red-300 transition-colors">
                        {policy.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {policy.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 bg-gradient-to-br from-red-500/5 via-card/40 to-rose-500/5 backdrop-blur-xl border border-red-500/15 rounded-3xl p-12 text-center overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent">
              {t("policies.questionsTitle")}
            </h2>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="gap-2 rounded-full px-8 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold discord-glow"
                onClick={() => openDiscordProfile(profile.discord)}
              >
                <MessageSquare className="w-5 h-5" />
                {t("policies.contactDiscord")}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
