// src/components/layout/Navbar.tsx

"use client";

import React, { useEffect, useState, memo } from "react";
import { Link, useLocation } from "wouter";
import { Settings, MessageSquare } from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";

// ─── Constants ────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/",          label: "Home"      },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/games",     label: "Games"     },
  { href: "/pricing",   label: "Pricing"   },
  { href: "/reviews",   label: "Reviews"   },
  { href: "/policies",  label: "Policies"  },
];

const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_INVITE_URL ?? "https://discord.gg/yourserver";

// ─── Clock Hook ───────────────────────────────────────────────────────────────

/**
 * Returns a formatted HH:MM:SS time string that only updates when the string
 * value actually changes, preventing unnecessary re-renders on sub-second ticks.
 */
function useFormattedClock(): { timeStr: string; gmtLabel: string } {
  const format = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
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

  const now     = new Date();
  const [state, setState] = useState({ timeStr: format(now), gmtLabel: buildGmt(now) });

  useEffect(() => {
    const id = setInterval(() => {
      const d       = new Date();
      const timeStr = format(d);
      // Only update state when the formatted string actually changes (every ~1 s).
      setState((prev) =>
        prev.timeStr === timeStr ? prev : { timeStr, gmtLabel: buildGmt(d) }
      );
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  return state;
}

// ─── ClockBadge (memoised — will not re-render the Navbar tree) ──────────────

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
//
// CLS FIX — span.text-sm.md:text-base.tracking-tight
// ────────────────────────────────────────────────────
// Google's CLS audit (Lighthouse / lab data) identified this span as the
// shifting element. Two compounding sources:
//
//   1. Webfont FOUT: the display font loads asynchronously. Before it arrives
//      the browser renders the text in the fallback system font (typically
//      slightly wider or narrower). When the webfont swaps in the glyph
//      metrics change, expanding or contracting the inline box. Because the
//      NavLogo flex item has no reserved width, the flex row re-measures and
//      pushes its siblings (nav links, right cluster) horizontally — this is
//      recorded as a CLS shift because it moves visible elements.
//
//   2. Image error → fallback swap: when profile.png fails to load, React
//      replaces the <img> with a <span>Y</span>. Even though the avatar
//      container is fixed at h-7 w-7, the gap-2.5 flex row momentarily
//      re-composites, producing a micro-shift in the logo text position.
//
// Fixes applied:
//   a) `whitespace-nowrap` — prevents the static string "youssef_design" from
//      ever wrapping, eliminating height changes caused by line breaks.
//   b) `min-w-[7.5rem]` — pre-reserves 120 px for the logo text inline box.
//      The string "youssef_design" measures ~100–115 px at text-sm/text-base;
//      reserving 120 px means the font swap can never expand into unallocated
//      space. The flex item width is stable from the very first paint, so no
//      sibling is ever displaced.
//   c) `text-sm` only (responsive `md:text-base` removed) — the jump from
//      0.875 rem to 1 rem at the md breakpoint is a predictable layout change
//      the browser handles before paint, but some CLS measurement tools record
//      it as a shift if the initial viewport width is close to the breakpoint
//      and a slow network delays the CSS. Locking the size to `text-sm`
//      eliminates this edge case entirely; the visual difference is negligible
//      for a brand logo.
//   d) Explicit `width` and `height` attributes on the avatar <img> — the
//      h-7 w-7 Tailwind classes set CSS width/height but the browser still
//      needs the HTML attributes for the intrinsic aspect-ratio reservation
//      before CSS is applied, preventing a micro-shift on first paint.

const NavLogo = memo(function NavLogo() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-bold text-white hover:opacity-80 transition-opacity"
    >
      {/*
        Avatar container: fixed h-7 w-7 in CSS + explicit width/height HTML
        attributes so the browser can reserve the 28×28 px slot before any
        CSS is applied (eliminates a micro layout-shift on first paint).
      */}
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
        Logo text — CLS-hardened:
          • whitespace-nowrap: never wraps, never changes line count
          • min-w-[7.5rem]:   reserves the inline box before font swap
          • text-sm only:     eliminates the md:text-base breakpoint jump
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
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
                    {link.label}
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
              aria-label="Open settings"
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
              aria-label="Discord"
              className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] transition-colors px-2.5 md:px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              <MessageSquare size={14} aria-hidden="true" />
              <span className="sr-only md:not-sr-only">Discord</span>
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
