import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { BackgroundOverlay } from "@/components/BackgroundOverlay";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Pause heavy CSS animations during fast scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!document.body.classList.contains("is-scrolling")) {
        document.body.classList.add("is-scrolling");
      }
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
      }, 150);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // Shooting stars (reduced for performance)
  useEffect(() => {
    const createShootingStar = () => {
      const container = document.getElementById("shootingStars");
      if (!container || document.body.classList.contains("is-scrolling")) return;
      const star = document.createElement("div");
      star.className = "shooting-star";
      star.style.top = `${Math.random() * 50}%`;
      star.style.left = `${Math.random() * 70 + 20}%`;
      container.appendChild(star);
      setTimeout(() => star.remove(), 3000);
    };
    const interval = setInterval(createShootingStar, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      {/* Global fixed background image + theme-aware overlay */}
      <BackgroundOverlay />

      {/* Decorative animated layers (stars, nebulas) — stacked above background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="galaxy-bg">
          <div className="stars-layer stars-layer-1" />
          <div className="stars-layer stars-layer-2" />
          <div className="stars-layer stars-layer-3" />
          <div className="nebula nebula-1" />
          <div className="nebula nebula-2" />
          <div className="shooting-stars-container" id="shootingStars" />
          <div className="vignette" />
        </div>
        <div className="light-bg">
          <div className="light-gradient-1" />
          <div className="light-gradient-2" />
        </div>
      </div>

      {/* Content — no AnimatePresence here; App.tsx handles page transitions */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 mt-16">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
