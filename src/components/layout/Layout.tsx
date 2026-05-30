// src/components/layout/Layout.tsx

import {
  ReactNode, useEffect, useRef,
} from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLocation } from "wouter";
import { BackgroundOverlay } from "@/components/BackgroundOverlay";

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location]  = useLocation();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);

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

  useEffect(() => {
    const sync = () => {
      document.body.classList.toggle("page-hidden", document.hidden);
    };
    document.addEventListener("visibilitychange", sync, { passive: true });
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col relative bg-transparent">

      {/* Fixed background image — zIndex:0 */}
      <BackgroundOverlay />

      {/* Decorative animated layers — z-[1]: above BackgroundOverlay, below content */}
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
          <div className="vignette" />
        </div>
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
