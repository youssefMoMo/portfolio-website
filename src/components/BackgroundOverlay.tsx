// src/components/BackgroundOverlay.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  MOBILE CRASH FIX — backgroundAttachment: "fixed" removed
//    • `backgroundAttachment: "fixed"` triggers a full-page repaint on every
//      scroll frame on iOS Safari and most Android browsers. The GPU cannot
//      promote a fixed-attachment background to its own compositor layer
//      (WebKit bug active since iOS 8). Result: continuous layout repaints,
//      heavy FPS drops, and battery drain during any page scroll on mobile.
//    • Fix: the property is removed entirely. The visual result — a background
//      image that covers the viewport — is identical without it when the
//      container is `position: fixed`. The containing div is already
//      `fixed inset-0`, so the image stays anchored to the viewport with
//      zero scroll repaints.
//
//  BLUR + SCALE OPTIMISATION
//    • Combining `filter: blur(...)` with `transform: scale(...)` on the same
//      element is expensive: the browser must rasterise the layer at a larger
//      resolution before applying the blur kernel.
//    • The scale is required only to hide the dark edges that appear when
//      blur samples beyond the image boundary. Since `filter: blur(0.5px)`
//      needs only ~1–2 px of bleed, the scale can be reduced from 1.03 to
//      1.01 — a 66 % reduction in the overdraw area.
//    • `will-change: transform` promotes the layer to its own compositor
//      surface so subsequent theme changes (which toggle the filter) do not
//      trigger a style recalc on the main thread.
//    • On mobile (detected via `@media (max-width: 767px)` equivalent), the
//      blur is removed entirely. A 0.5 px blur provides no perceptible
//      softening on high-DPI mobile screens and only adds rasterisation cost.
//
//  LOCAL IMAGE FALLBACK
//    • If `/images/global/bg.png` is unavailable, `onError` on a hidden <img>
//      probe detects the failure and the layer switches to a CSS radial-gradient
//      that approximates the original aesthetic — no broken-image box is shown.
//
//  REDUCED MOTION
//    • The overlay honours `prefers-reduced-motion`. When the media query
//      matches, no transform or filter is applied to the image layer.

import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

// ─── Local CSS-gradient fallback ─────────────────────────────────────────────
// Shown if bg.png fails to load. Approximates the original dark/moody bg.
const DARK_GRADIENT_FALLBACK =
  "radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0b0b0f 65%)";
const LIGHT_GRADIENT_FALLBACK =
  "radial-gradient(ellipse at 50% 0%, #e8e8f0 0%, #f5f5f7 65%)";

const BG_IMAGE_PATH = "/images/global/bg.png";

// ─── Component ────────────────────────────────────────────────────────────────

export function BackgroundOverlay() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Whether the user prefers reduced motion — skip transform/filter when true
  const [reducedMotion, setReducedMotion] = useState(false);
  // Whether bg.png failed to load — use CSS gradient fallback
  const [imgFailed, setImgFailed] = useState(false);
  // Whether we're on a narrow (mobile) viewport — skip blur on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Reduced-motion preference
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMqChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onMqChange);

    // Mobile viewport (<768 px width)
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    setIsMobile(mobileQuery.matches);
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mobileQuery.addEventListener("change", onMobileChange);

    return () => {
      mq.removeEventListener("change", onMqChange);
      mobileQuery.removeEventListener("change", onMobileChange);
    };
  }, []);

  // ── Image layer styles ────────────────────────────────────────────────────

  // On mobile: no blur, no scale — zero repaint cost during scroll.
  // On desktop with reduced motion: no transform/filter either.
  // On desktop normal: minimal scale (1.01) + very slight blur (0.5px).
  const applyEffects = !isMobile && !reducedMotion;

  const imageLayerStyle: React.CSSProperties = imgFailed
    ? {
        // CSS gradient fallback — no image, no network dependency
        background: isDark ? DARK_GRADIENT_FALLBACK : LIGHT_GRADIENT_FALLBACK,
      }
    : {
        backgroundImage: `url(${BG_IMAGE_PATH})`,
        backgroundSize:     "cover",
        backgroundPosition: "center",
        backgroundRepeat:   "no-repeat",
        // backgroundAttachment: "fixed" intentionally omitted — see notes above.
        // The parent `fixed inset-0` already pins the overlay to the viewport.
        ...(applyEffects
          ? {
              // Reduced scale (1.01 vs old 1.03) covers the 1-2px blur bleed
              // at a fraction of the original overdraw cost.
              filter:          isDark
                ? "blur(0.5px) brightness(0.8)"
                : "blur(0.5px) brightness(0.92)",
              transform:       "scale(1.01)",
              transformOrigin: "center",
              willChange:      "transform",
            }
          : {
              // No effects on mobile or when reduced motion is preferred —
              // background image still covers the viewport cleanly.
              filter:          isDark ? "brightness(0.8)" : "brightness(0.92)",
            }),
      };

  // ── Cinematic gradient overlay ────────────────────────────────────────────

  const gradientOverlayStyle: React.CSSProperties = {
    background: isDark
      ? [
          "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(11,11,15,0.55) 60%, rgba(11,11,15,0.70) 100%)",
          "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.35) 100%)",
        ].join(", ")
      : [
          "linear-gradient(180deg, rgba(245,245,247,0.60) 0%, rgba(245,245,247,0.75) 100%)",
          "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(245,245,247,0.40) 100%)",
        ].join(", "),
  };

  // ── Soft side vignette ────────────────────────────────────────────────────

  const vignetteStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(to right, rgba(0,0,0,0.20) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.20) 100%)"
      : "linear-gradient(to right, rgba(245,245,247,0.15) 0%, transparent 15%, transparent 85%, rgba(245,245,247,0.15) 100%)",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: isDark ? "#0b0b0f" : "#f5f5f7" }}
    >
      {/*
        Hidden <img> probe — detects bg.png load failure without rendering
        a broken image box in the UI. Falls back to CSS gradient on error.
      */}
      {!imgFailed && (
        <img
          src={BG_IMAGE_PATH}
          alt=""
          aria-hidden="true"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          onError={() => setImgFailed(true)}
          loading="eager"
          fetchPriority="low"
        />
      )}

      {/* Layer 1: image (or CSS gradient fallback) */}
      <div className="absolute inset-0" style={imageLayerStyle} />

      {/* Layer 2: cinematic gradient tint */}
      <div className="absolute inset-0" style={gradientOverlayStyle} />

      {/* Layer 3: side vignette for depth */}
      <div className="absolute inset-0" style={vignetteStyle} />
    </div>
  );
}

export default BackgroundOverlay;
