// src/components/layout/Footer.tsx — fully translated
import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { profile } from "@/lib/data";
import { DISCORD_INVITE_URL } from "@/lib/discord";

const NAV_LINKS_KEYS = [
  { href: "/",          key: "nav.home"      },
  { href: "/portfolio", key: "nav.portfolio"  },
  { href: "/games",     key: "nav.games"      },
  { href: "/pricing",   key: "nav.pricing"    },
  { href: "/reviews",   key: "nav.reviews"    },
  { href: "/policies",  key: "nav.policies"   },
] as const;

export default function Footer() {
  const { t, isRTL } = useLanguage();

  return (
    <footer
      dir={isRTL ? "rtl" : "ltr"}
      className="relative z-10 border-t border-white/5 bg-background/40 backdrop-blur-xl mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center ring-1 ring-primary/40">
                <span className="text-primary font-black text-xs select-none">Y</span>
              </div>
              <span className="font-bold text-sm tracking-tight text-white">youssef_design</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t("footer.follow")}
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {NAV_LINKS_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t("settings.contact")}
            </p>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 text-[#7289da] text-xs font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t("nav.discord")}
            </a>
            <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
              {t("footer.transform")}
            </p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>© 2026 {t("footer.rights")}</span>
          <span>{t("footer.role")}</span>
        </div>
      </div>
    </footer>
  );
}
