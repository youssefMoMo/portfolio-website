// src/components/layout/Layout.tsx

import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import Navbar from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "wouter";
import { BackgroundOverlay } from "@/components/BackgroundOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StarConfig {
  id: number;
  top: string;
  left: string;
}

// ─── ShootingStar ─────────────────────────────────────────────────────────────

/**
 * Renders a single shooting-star div with randomly generated position.
 * Calls `onComplete` when its CSS animation ends so the parent can
 * remove it from state — no imperative DOM manipulation required.
 */
function ShootingStar({
  config,
  onComplete,
}: {
  config: StarConfig;
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

export default function Layout({ children }: LayoutProps) {
  const [location]  = useLocation();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);
  const nextId      = useRef(0);

  // React-managed star pool
  const [stars, setStars] = useState<StarConfig[]>([]);

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

  // ── Shooting-star spawner (React state, zero imperative DOM) ──────────────
  useEffect(() => {
    const spawn = () => {
      // Skip while the user is actively scrolling to avoid jank.
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

  // Cleanup callback passed down to each ShootingStar
  const removeStar = useCallback((id: number) => {
    setStars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      {/* Fixed background image + theme-aware overlay — bottom-most layer (z-0) */}
      <BackgroundOverlay />

      {/* Decorative animated layers — z-[1]: above BackgroundOverlay, below content */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="galaxy-bg">
          <div className="stars-layer stars-layer-1" />
          <div className="stars-layer stars-layer-2" />
          <div className="stars-layer stars-layer-3" />
          <div className="nebula nebula-1" />
          <div className="nebula nebula-2" />

          {/* React-owned shooting stars — no document.createElement */}
          <div className="shooting-stars-container">
            {stars.map((star) => (
              <ShootingStar key={star.id} config={star} onComplete={removeStar} />
            ))}
          </div>

          <div className="vignette" />
        </div>

        <div className="light-bg">
          <div className="light-gradient-1" />
          <div className="light-gradient-2" />
        </div>
      </div>

      {/* Page content — z-10: above all decorative layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        {/*
          pt-14 precisely offsets the fixed h-14 (56 px) Navbar height,
          eliminating the 8 px gap that mt-16 (64 px) previously introduced.
        */}
        <main className="flex-1 pt-14">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
