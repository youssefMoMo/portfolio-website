import { motion } from "framer-motion";
import { Twitter, MessageSquare, Heart } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DISCORD_PROFILE_URL } from "@/lib/discord";

export function Footer() {
  const { t, isRTL } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card/40 backdrop-blur-xl border-t border-white/5 py-12" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className={`text-center ${isRTL ? "md:text-right" : "md:text-left"}`}>
            <h3 className="font-display text-xl font-bold mb-2">
              Youssef<span className="text-primary">.</span>
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Tagline */}
          <div className="text-center">
            <p className="text-foreground font-medium mb-2">
              {t("footer.role")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("footer.transform")}
            </p>
          </div>

          {/* Socials */}
          <div className={`text-center ${isRTL ? "md:text-left" : "md:text-right"}`}>
            <h4 className="font-semibold mb-4">{t("footer.follow")}</h4>
            <div className={`flex justify-center gap-4 ${isRTL ? "md:justify-start" : "md:justify-end"}`}>
              <motion.a
                href="https://x.com/_YoussefMoMo"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-primary" />
              </motion.a>
              <motion.a
                href={DISCORD_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="p-2 rounded-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 transition-colors"
                aria-label="Discord"
              >
                <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              </motion.a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            © {currentYear} {t("footer.rights")}
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
