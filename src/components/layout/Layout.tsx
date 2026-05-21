import { ReactNode } from "react";
// FIX: Was `import { Navbar } from "./Navbar"` (named import) but Navbar.tsx
// only has a default export — the named binding resolved to `undefined`,
// crashing silently on every public page render.
import Navbar from "./Navbar";
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
      {/* Global fixed background image + theme-aware overlay (bottom-most layer, z-0) */}
      <BackgroundOverlay />

      {/* Decorative animated layers (stars, nebulas) — z-[1] so they sit ABOVE
          the BackgroundOverlay but BELOW page content (z-10). Without explicit
          z-index higher than 0, this wrapper would share z-0 with BackgroundOverlay
          and DOM order would put it on top, which used to cover the bg image. */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
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
