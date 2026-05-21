"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, MessageSquare } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/games", label: "Games" },
  { href: "/pricing", label: "Pricing" },
  { href: "/reviews", label: "Reviews" },
  { href: "/policies", label: "Policies" },
];

// ─── Clock Hook ──────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ─── Clock Display ────────────────────────────────────────────────────────────
/**
 * ClockBadge
 *
 * CHANGE: Upgraded from `text-sm font-normal` with muted colours to
 * `text-base md:text-md font-bold` with crisp, high-contrast tokens.
 * Both the time and GMT offset sit inside flat, solid-border pill frames
 * that read clearly on both dark and semi-transparent navbar backgrounds.
 */
function ClockBadge() {
  const now = useClock();

  // Format HH:MM:SS in local time
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // GMT offset string, e.g. "GMT+3" or "GMT-5"
  const offsetMinutes = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const gmtLabel =
    offsetMins > 0
      ? `GMT${sign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`
      : `GMT${sign}${offsetHours}`;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Current time: ${timeStr} ${gmtLabel}`}>
      {/*
       * Time pill
       * Before: text-sm text-white/50 bg-white/5
       * After:  text-base font-bold text-white bg-secondary/70 border border-white/20
       */}
      <div
        className="flex items-center rounded-lg border border-white/20
                   bg-secondary/70 backdrop-blur-sm
                   px-3 py-1"
      >
        <span className="font-mono text-base md:text-[15px] font-bold text-white tracking-wider leading-none tabular-nums">
          {timeStr}
        </span>
      </div>

      {/*
       * GMT badge pill
       * Before: text-xs text-white/40
       * After:  text-sm font-bold text-primary border border-primary/30
       */}
      <div
        className="flex items-center rounded-md border border-primary/40
                   bg-primary/10 px-2 py-1"
      >
        <span className="text-sm font-bold text-primary leading-none tracking-tight">
          {gmtLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-white/8 bg-background/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-white hover:opacity-80 transition-opacity"
        >
          {/* Replace with your actual logo component / SVG */}
          <div className="h-7 w-7 rounded-full bg-primary/30 ring-1 ring-primary/50 flex items-center justify-center text-primary text-xs font-black">
            Y
          </div>
          <span className="text-sm md:text-base tracking-tight">
            youssef_design
          </span>
        </Link>

        {/* ── Nav Links (desktop) ──────────────────────────────────── */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium
                           text-white/70 hover:text-white hover:bg-white/8
                           transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Right Cluster ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Clock – upgraded contrast & sizing */}
          <ClockBadge />

          {/* Settings icon */}
          <button
            aria-label="Settings"
            className="rounded-lg p-2 text-white/50 hover:text-white
                       hover:bg-white/8 transition-colors"
          >
            <Settings size={16} />
          </button>

          {/* Discord CTA */}
          <a
            href="https://discord.gg/yourserver"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg
                       bg-[#5865F2] hover:bg-[#4752c4] transition-colors
                       px-3.5 py-1.5 text-sm font-semibold text-white"
          >
            <MessageSquare size={14} />
            Discord
          </a>
        </div>
      </nav>
    </header>
  );
}
