// src/components/layout/Layout.tsx
//
// DARK-MODE LOCK — 2026
// ─────────────────────────────────────────────────────────────────────────────
// Light mode is permanently eliminated.  This file:
//
//   1. Applies `dark` to <html> synchronously in a script tag embedded in
//      index.html is the canonical source of truth; ThemeProvider above also
//      stamps it on React mount as a redundant guard.
//
//   2. Removes the <div class="light-bg"> decorative layer entirely —
//      those CSS classes (.light-bg, .light-gradient-1/2) only render on the
//      light theme and add dead DOM weight in a dark-only build.
//
//   3. Keeps the galaxy-bg / stars / nebula / shooting-stars pipeline intact.
//      These classes are scoped to dark mode in index.css already, so no
//      further class changes are needed on those elements.
//
//   4. All other behaviour (scroll-to-top, is-scrolling body class, shooting
//      star React state pool) is unchanged.

import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLocation } from "wouter";
import { BackgroundOverlay } from "@/components/BackgroundOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StarConfig {
  id:   number;
  top:  string;
  left: string;
}

// ─── ShootingStar ─────────────────────────────────────────────────────────────

function ShootingStar({
  config,
  onComplete,
}: {
  config:     StarConfig;
  onComplete: (id: number) => void;
}) {
  const handleAnimationEnd = useCallback(() => {
    onComplete(config.id);
  }, [config.id, onComplete]);

  return (
    <div
      className="shooting-star"
      style={{ top: config.top, left: config.left }}
      onAnimationEnd={handleAnimationEnd}
      aria-hidden="true"
    />
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location]  = useLocation();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);
  const nextId      = useRef(0);

  const [stars, setStars] = useState<StarConfig[]>([]);

  // ── Hard-lock <html> to dark class on mount ────────────────────────────────
  //
  // Belt-and-suspenders guard: ThemeProvider already stamps `dark` on mount,
  // but Layout mounts synchronously inside the React tree before any lazy
  // chunk can add a `light` class.  This effect runs once and is effectively
  // instantaneous — no matchMedia, no localStorage read, no system-pref query.

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "system");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    // Overwrite any stale storage value from before the dark-lock migration.
    try { localStorage.setItem("youssef-ui-theme", "dark"); } catch { /* noop */ }
  }, []); // run once on mount

  // ── Scroll-to-top on route change ─────────────────────────────────────────

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // ── Pause heavy CSS animations during fast scroll ─────────────────────────

  useEffect(() => {
    const handleScroll = () => {
      if (!isScrolling.current) {
        document.body.classList.add("is-scrolling");
        isScrolling.current = true;
      }
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
        isScrolling.current = false;
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // ── Shooting-star spawner ──────────────────────────────────────────────────

  useEffect(() => {
    const spawn = () => {
      if (isScrolling.current) return;
      setStars((prev) => [
        ...prev,
        {
          id:   nextId.current++,
          top:  `${Math.random() * 50}%`,
          left: `${Math.random() * 70 + 20}%`,
        },
      ]);
    };
    const interval = setInterval(spawn, 10_000);
    return () => clearInterval(interval);
  }, []);

  const removeStar = useCallback((id: number) => {
    setStars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col relative bg-background">

      {/* Fixed background image — bottom-most layer (z-[-1]) */}
      <BackgroundOverlay />

      {/*
        Decorative animated layers — z-[1]: above BackgroundOverlay, below content.

        NOTE: The <div class="light-bg"> block that previously lived here has
        been permanently removed.  It contained .light-gradient-1 and
        .light-gradient-2 which are exclusively used by the light theme.
        Keeping dead DOM in a dark-only build added layout weight for zero
        visual benefit.
      */}
      <div className="fixed inset-0 z-[1] pointer-events-none" aria-hidden="true">
        <div className="galaxy-bg">
          <div className="stars-layer stars-layer-1" />
          <div className="stars-layer stars-layer-2" />
          <div className="stars-layer stars-layer-3" />
          <div className="nebula nebula-1" />
          <div className="nebula nebula-2" />

          <div className="shooting-stars-container">
            {stars.map((star) => (
              <ShootingStar key={star.id} config={star} onComplete={removeStar} />
            ))}
          </div>

          <div className="vignette" />
        </div>
        {/* light-bg removed — dark-only build */}
      </div>

      {/* Page content — z-10: above all decorative layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-14">
          {children}
        </main>
        <Footer />
      </div>

    </div>
  );
}

export default Layout;
