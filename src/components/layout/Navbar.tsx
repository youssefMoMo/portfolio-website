// src/components/layout/Navbar.tsx
"use client";

import React, { useEffect, useState, memo } from "react";
import { Link, useLocation } from "wouter";
import { Settings, MessageSquare } from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";
import { useLanguage } from "@/hooks/use-language";
import type { TranslationKey } from "@/lib/data";

// ─── Nav links — keys only; labels resolved via t() ──────────────────────────

interface NavLink {
  href: string;
  key:  TranslationKey;
}

const NAV_LINKS: NavLink[] = [
  { href: "/",          key: "nav.home"      },
  { href: "/portfolio", key: "nav.portfolio"  },
  { href: "/games",     key: "nav.games"      },
  { href: "/pricing",   key: "nav.pricing"    },
  { href: "/reviews",   key: "nav.reviews"    },
  { href: "/policies",  key: "nav.policies"   },
];

const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_INVITE_URL ?? "https://discord.gg/yourserver";

// ─── Clock Hook ───────────────────────────────────────────────────────────────

function useFormattedClock(): { timeStr: string; gmtLabel: string } {
  const format = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour:   "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const buildGmt = (d: Date): string => {
    const offsetMinutes = -d.getTimezoneOffset();
    const absHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const absMins  = Math.abs(offsetMinutes) % 60;
    const sign     = offsetMinutes >= 0 ? "+" : "-";
    return absMins > 0
      ? `GMT${sign}${absHours}:${String(absMins).padStart(2, "0")}`
      : `GMT${sign}${absHours}`;
  };

  const now = new Date();
  const [state, setState] = useState({ timeStr: format(now), gmtLabel: buildGmt(now) });

  useEffect(() => {
    const id = setInterval(() => {
      const d       = new Date();
      const timeStr = format(d);
      setState((prev) =>
        prev.timeStr === timeStr ? prev : { timeStr, gmtLabel: buildGmt(d) }
      );
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  return state;
}

// ─── ClockBadge ───────────────────────────────────────────────────────────────

const ClockBadge = memo(function ClockBadge() {
  const { timeStr, gmtLabel } = useFormattedClock();

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Current time: ${timeStr} ${gmtLabel}`}
    >
      <div className="flex items-center rounded-lg border border-white/20 bg-zinc-900/90 backdrop-blur-sm px-3 py-1">
        <span className="font-mono text-sm font-bold text-white tracking-wider leading-none tabular-nums">
          {timeStr}
        </span>
      </div>
      <div className="flex items-center rounded-md border border-primary/40 bg-primary/10 px-2 py-1">
        <span className="text-sm font-bold text-primary leading-none tracking-tight">
          {gmtLabel}
        </span>
      </div>
    </div>
  );
});

// ─── NavLogo ──────────────────────────────────────────────────────────────────

const NavLogo = memo(function NavLogo() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-bold text-white hover:opacity-80 transition-opacity"
    >
      <div className="h-7 w-7 rounded-full ring-1 ring-primary/50 overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center">
        {imgFailed ? (
          <span className="text-primary text-xs font-black select-none" aria-hidden="true">
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
      {/*
        CLS-hardened logo text:
          • whitespace-nowrap  — never wraps; line count never changes
          • min-w-[7.5rem]     — pre-reserves inline box before webfont swap
          • text-sm only       — eliminates the md:text-base breakpoint jump
      */}
      <span className="text-sm tracking-tight whitespace-nowrap min-w-[7.5rem] inline-block">
        youssef_design
      </span>
    </Link>
  );
});

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [location]                      = useLocation();

  // t() for nav labels; isRTL for layout direction
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        dir={isRTL ? "rtl" : "ltr"}
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-white/8 bg-background/80 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">

          {/* Logo */}
          <NavLogo />

          {/* Nav Links — desktop */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/8"
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right Cluster */}
          <div className="flex items-center gap-2">
            {/* Clock — isolated in its own memo'd component */}
            <ClockBadge />

            {/* Settings */}
            <button
              aria-label={t("settings.closeLabel")}
              onClick={() => setSettingsOpen(true)}
              className={`rounded-lg p-2 transition-colors ${
                settingsOpen
                  ? "text-primary bg-primary/10"
                  : "text-white/50 hover:text-white hover:bg-white/8"
              }`}
            >
              <Settings size={16} />
            </button>

            {/* Discord — icon-only on mobile, icon+text on md+ */}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("nav.discord")}
              className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] transition-colors px-2.5 md:px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              <MessageSquare size={14} aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("nav.discord")}</span>
            </a>
          </div>

        </nav>
      </header>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
