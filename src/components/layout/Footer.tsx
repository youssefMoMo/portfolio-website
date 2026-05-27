// src/components/layout/Footer.tsx
//
// FIX CHANGELOG:
//   BUG 3 — Broken footer avatar:
//     Uses the exact same /images/global/profile.png path + imgFailed fallback
//     pipeline as Navbar.tsx's NavLogo component. A "Y" monogram renders when
//     the image errors so the avatar slot is never empty.
//
//   LIGHT MODE — full contrast pass:
//     All text nodes carry explicit light-mode classes so they are legible
//     on the pale `hsl(--background)` canvas without relying on dark-mode
//     defaults. Pattern: `text-slate-700 dark:text-zinc-300` for body copy,
//     `text-slate-900 dark:text-white` for headings/brand.

import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";

// ─── Discord invite URL ───────────────────────────────────────────────────────

const DISCORD_INVITE_URL: string =
  (import.meta.env.VITE_DISCORD_INVITE_URL as string | undefined) ??
  "https://discord.gg/yourserver";

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/",          key: "nav.home"      },
  { href: "/portfolio", key: "nav.portfolio"  },
  { href: "/games",     key: "nav.games"      },
  { href: "/pricing",   key: "nav.pricing"    },
  { href: "/reviews",   key: "nav.reviews"    },
  { href: "/policies",  key: "nav.policies"   },
] as const;

// ─── FooterAvatar ─────────────────────────────────────────────────────────────
//
// Mirrors Navbar.tsx's NavLogo image pipeline exactly:
//   • Attempts /images/global/profile.png first.
//   • On error falls back to a "Y" monogram inside the same ring/bg shell.
// This guarantees the footer avatar is never a broken-image box.

function FooterAvatar() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="h-7 w-7 rounded-full ring-1 ring-primary/50 overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center">
      {imgFailed ? (
        <span
          className="text-primary text-xs font-black select-none"
          aria-hidden="true"
        >
          Y
        </span>
      ) : (
        <img
          src="/images/global/profile.png"
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Footer() {
  const { t, isRTL } = useLanguage();

  return (
    <footer
      dir={isRTL ? "rtl" : "ltr"}
      className="relative z-10 border-t border-slate-200 dark:border-white/5 bg-white/60 dark:bg-background/40 backdrop-blur-xl mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* ── Brand ──────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* Synchronized avatar with Navbar — same image + fallback */}
              <FooterAvatar />
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                youssef_design
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed max-w-[220px]">
              {t("footer.tagline")}
            </p>
          </div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-3">
              {t("footer.follow")}
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-slate-600 dark:text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-3">
              {t("settings.contact")}
            </p>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 text-[#4752C4] dark:text-[#7289da] text-xs font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              {t("nav.discord")}
            </a>
            <p className="text-[10px] text-slate-500 dark:text-muted-foreground mt-3 leading-relaxed">
              {t("footer.transform")}
            </p>
          </div>

        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-muted-foreground">
          <span>© 2026 {t("footer.rights")}</span>
          <span>{t("footer.role")}</span>
        </div>

      </div>
    </footer>
  );
}
