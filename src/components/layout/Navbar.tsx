// src/components/layout/Navbar.tsx
//
// ✅ FIX: Settings button was completely dead — no onClick, no modal rendered.
//   Now wires the gear icon to open SettingsModal via local state.

"use client";

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Settings, MessageSquare } from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/",          label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/games",     label: "Games" },
  { href: "/pricing",   label: "Pricing" },
  { href: "/reviews",   label: "Reviews" },
  { href: "/policies",  label: "Policies" },
];

// ─── Clock Hook ───────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Clock Badge ──────────────────────────────────────────────────────────────
function ClockBadge() {
  const now = useClock();

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  const offsetMinutes = -now.getTimezoneOffset();
  const offsetHours   = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins    = Math.abs(offsetMinutes) % 60;
  const sign          = offsetMinutes >= 0 ? "+" : "-";
  const gmtLabel      = offsetMins > 0
    ? "GMT" + sign + offsetHours + ":" + String(offsetMins).padStart(2, "0")
    : "GMT" + sign + offsetHours;

  return (
    <div className="flex items-center gap-1.5" aria-label={"Current time: " + timeStr + " " + gmtLabel}>
      <div className="flex items-center rounded-lg border border-white/20 bg-zinc-900/90 backdrop-blur-sm px-3 py-1">
        <span className="font-mono text-base md:text-[15px] font-bold text-white tracking-wider leading-none tabular-nums">
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
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const [scrolled,         setScrolled]         = useState(false);
  const [settingsOpen,     setSettingsOpen]      = useState(false);
  const [location] = useLocation();

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

          {/* ── Logo ────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-white hover:opacity-80 transition-opacity"
          >
            <div className="h-7 w-7 rounded-full ring-1 ring-primary/50 overflow-hidden flex-shrink-0 bg-primary/20">
              <img
                src="/images/global/profile.png"
                alt="youssef_design"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const fb = img.parentElement;
                  if (fb) {
                    fb.classList.add("flex", "items-center", "justify-center", "text-primary", "text-xs", "font-black");
                    fb.textContent = "Y";
                  }
                }}
              />
            </div>
            <span className="text-sm md:text-base tracking-tight">youssef_design</span>
          </Link>

          {/* ── Nav Links (desktop) ───────────────────────────────── */}
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

          {/* ── Right Cluster ──────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <ClockBadge />

            {/* Settings icon — NOW WIRED ✅ */}
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

            {/* Discord CTA */}
            <a
              href="https://discord.gg/yourserver"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] transition-colors px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              <MessageSquare size={14} />
              Discord
            </a>
          </div>

        </nav>
      </header>

      {/* Settings Modal — rendered here, right in the Navbar tree */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
