// src/components/layout/Footer.tsx

import { motion } from "framer-motion";
import { Twitter, MessageSquare } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DISCORD_PROFILE_URL } from "@/lib/discord";

export function Footer() {
  const { t, isRTL } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="w-full bg-white/80 dark:bg-card/40 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 py-12"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Three-column grid — stacks on mobile, horizontal on md+ */}
        <div className="flex flex-col md:flex-row gap-y-8 md:gap-y-0 md:gap-x-8 mb-8">

          {/* Brand */}
          <div className={`flex-1 text-center ${isRTL ? "md:text-right" : "md:text-left"}`}>
            <h3 className="font-display text-xl font-bold mb-2">
              Youssef<span className="text-primary">.</span>
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("footer.tagline", { defaultValue: "Crafting digital experiences with passion." })}
            </p>
          </div>

          {/* Tagline */}
          <div className="flex-1 text-center">
            <p className="text-foreground font-medium mb-2">
              {t("footer.role", { defaultValue: "Full-Stack Developer & Designer" })}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("footer.transform", { defaultValue: "Turning ideas into reality, one pixel at a time." })}
            </p>
          </div>

          {/* Socials */}
          <div className={`flex-1 text-center ${isRTL ? "md:text-left" : "md:text-right"}`}>
            <h4 className="font-semibold mb-4">
              {t("footer.follow", { defaultValue: "Follow Me" })}
            </h4>
            <div
              className={`flex justify-center gap-4 ${
                isRTL ? "md:justify-start" : "md:justify-end"
              }`}
            >
              {/* Twitter / X */}
              <motion.a
                href="https://x.com/_YoussefMoMo"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                aria-label="Follow Youssef on Twitter / X"
              >
                <Twitter className="w-5 h-5 text-primary" aria-hidden="true" />
              </motion.a>

              {/* Discord */}
              <motion.a
                href={DISCORD_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="p-2 rounded-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 transition-colors"
                aria-label="Connect with Youssef on Discord"
              >
                <MessageSquare className="w-5 h-5 text-[#5865F2]" aria-hidden="true" />
              </motion.a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-white/5 text-center">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2 flex-wrap">
            © {currentYear}{" "}
            {t("footer.rights", { defaultValue: "Youssef. All rights reserved. Made with" })}

            {/* Accessible animated heart */}
            <svg
              role="img"
              aria-label="Love and devotion"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-red-500 text-red-500 inline-block"
              aria-hidden="false"
              focusable="false"
            >
              <title>Love and devotion</title>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
