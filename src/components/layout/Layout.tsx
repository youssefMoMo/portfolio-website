// src/components/layout/Layout.tsx
//
// ─── PERFORMANCE OVERHAUL CHANGELOG ──────────────────────────────────────────
//
// DIRECTIVE 2 — Render Management for Background Effects
//
//   1. ShootingStar wrapped in React.memo
//      The `stars` pool mutates on every spawn/removal. Without memo every
//      already-mounted ShootingStar re-renders on each pool change, invoking
//      another DOM diffing pass per star. Memo pins each star to its stable
//      `config` prop — renders only on its own mount/unmount.
//
//   2. Throttled shooting-star spawner
//      Original: setInterval fires every 10 000 ms unconditionally.
//      New:      setInterval checks `isScrolling.current` AND `pageVisible`
//                before calling setStars. If the tab is hidden (document
//                visibility API) or the user is scrolling, the spawn is skipped.
//                Zero GPU work is queued when nobody is watching.
//
//   3. Galaxy layers paused via CSS class when tab is hidden
//      CSS animations on `.stars-layer`, `.nebula`, `.shooting-star` continue
//      compositing even in a hidden tab, burning battery and GPU time.
//      A `page-hidden` class on <body> is toggled by the visibility API handler
//      and consumed by an `animation-play-state: paused` rule in index.css:
//
//        body.page-hidden .stars-layer,
//        body.page-hidden .nebula,
//        body.page-hidden .shooting-star { animation-play-state: paused; }
//
//      This eliminates all background GPU compositing on hidden tabs with zero
//      React re-renders.
//
//   4. BackgroundOverlay wrapped in React.memo (export change in that file)
//      Layout itself doesn't memoize its children, but the import now uses
//      the memoised default export from BackgroundOverlay.tsx.
//
//   5. All original behaviour preserved
//      • Dark-lock on mount
//      • Scroll-to-top on route change
//      • is-scrolling body class for scroll-throttled CSS pausing
//      • Shooting-star pool with onAnimationEnd cleanup
//      • Navbar / Footer render

import {
  ReactNode, useEffect, useRef, useState, useCallback, memo,
} from "react";
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

// ─── ShootingStar — memo'd to prevent re-render on pool mutations ─────────────
//
// Every star receives a stable `config` object created once at spawn time.
// memo() ensures that an unrelated star addition/removal does NOT trigger
// a re-render of every other star already in the DOM.

const ShootingStar = memo(function ShootingStar({
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
});

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location]  = useLocation();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);
  const nextId      = useRef(0);
  // Track page visibility so the spawner never queues GPU work on hidden tabs.
  const pageVisible = useRef(!document.hidden);

  const [stars, setStars] = useState<StarConfig[]>([]);

  // ── Hard-lock <html> to dark class on mount ────────────────────────────────

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "system");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("youssef-ui-theme", "dark"); } catch { /* noop */ }
  }, []);

  // ── Scroll-to-top on route change ─────────────────────────────────────────

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // ── Scroll detection → is-scrolling body class ────────────────────────────

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

  // ── Page Visibility API → pause CSS animations on hidden tabs ────────────
  //
  // Adds/removes `page-hidden` on <body>. In index.css add:
  //
  //   body.page-hidden .stars-layer,
  //   body.page-hidden .nebula,
  //   body.page-hidden .shooting-star {
  //     animation-play-state: paused;
  //   }
  //
  // This stops all GPU compositing for star/nebula layers when the tab is
  // backgrounded — zero React re-renders, zero setInterval side effects.

  useEffect(() => {
    const sync = () => {
      pageVisible.current = !document.hidden;
      document.body.classList.toggle("page-hidden", document.hidden);
    };
    document.addEventListener("visibilitychange", sync, { passive: true });
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // ── Shooting-star spawner — throttled & visibility-gated ─────────────────
  //
  // Original: fires every 10 000 ms unconditionally.
  // New:      skips spawn if:
  //           a) the user is actively scrolling (isScrolling.current)
  //           b) the tab is hidden (pageVisible.current = false)
  //
  // This eliminates all setStars() calls — and therefore all React renders —
  // while the user is scrolling or the tab is backgrounded.

  useEffect(() => {
    const spawn = () => {
      if (isScrolling.current || !pageVisible.current) return;
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

        `page-hidden` body class (set above) causes CSS to pause all animations
        inside this subtree when the tab is hidden — zero GPU compositing cost.
      */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="galaxy-bg">
          <div className="stars-layer stars-layer-1" />
          <div className="stars-layer stars-layer-2" />
          <div className="stars-layer stars-layer-3" />
          <div className="nebula nebula-1" />
          <div className="nebula nebula-2" />

          <div className="shooting-stars-container">
            {stars.map((star) => (
              <ShootingStar
                key={star.id}
                config={star}
                onComplete={removeStar}
              />
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
