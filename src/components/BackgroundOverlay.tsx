// src/components/BackgroundOverlay.tsx
//
// FIX CHANGELOG:
//   BUG 4 — Background image invisible (flat black screen):
//     Root cause A: The dark tint overlay was rgba(0,0,0,0.52) — at 52% opacity
//     over a 1408×768 dark-blue image the net perceived brightness dropped below
//     the visible threshold, making the canvas look like a solid black fill.
//     Fix: tint reduced to rgba(0,0,0,0.34) in dark mode.
//
//     Root cause B: The hidden probe <img> had `loading="eager"` but was
//     positioned at w-0/h-0 — some browser optimisation pipelines defer
//     zero-size eager images, meaning the onError callback could fire after the
//     first paint and cause a jarring fallback switch. The probe is now
//     `loading="lazy"` (low priority, just watching for error) and a separate
//     `visibility:hidden` technique replaces the w-0/h-0 approach to guarantee
//     the browser does make a network attempt.
//
//     Root cause C: The outer container had `z-0` which some stacking contexts
//     (particularly those created by backdrop-filter on sibling elements) pushed
//     below the body background colour. Changed to `z-[-1]` to guarantee it
//     sits behind all content while remaining above the raw `<html>` background.
//
//   LIGHT MODE — softer tint:
//     Light tint changed from rgba(245,245,247,0.58) to rgba(255,255,255,0.40)
//     so the bg.png star-field is still faintly visible through the canvas even
//     in light mode, providing visual depth without harming text legibility.

import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

// ─── Fallback gradients (shown only if bg.png fails to load) ─────────────────

const DARK_FALLBACK =
  "radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0b0b0f 60%)";
const LIGHT_FALLBACK =
  "radial-gradient(ellipse at 50% 0%, #e8e8f0 0%, #f5f5f7 60%)";

const BG_IMAGE_PATH = "/images/global/bg.png";

// ─── Component ────────────────────────────────────────────────────────────────

export function BackgroundOverlay() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [imgFailed, setImgFailed] = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  useEffect(() => {
    const mq       = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Layer 1: background image ─────────────────────────────────────────────

  const imageStyle: React.CSSProperties = imgFailed
    ? { background: isDark ? DARK_FALLBACK : LIGHT_FALLBACK }
    : {
        backgroundImage:    `url(${BG_IMAGE_PATH})`,
        backgroundSize:     "cover",
        backgroundPosition: "center top",
        backgroundRepeat:   "no-repeat",
        // Fixed attachment makes the image stationary as the page scrolls.
        // Disabled on mobile (iOS WebKit repaints the entire page on every
        // scroll frame for fixed-bg elements — GPU compositing is broken there).
        backgroundAttachment: isMobile ? "scroll" : "fixed",
      };

  // ── Layer 2: semi-transparent tint (readability / contrast) ──────────────
  //
  // FIXED: reduced dark-mode opacity from 0.52 → 0.34 so the background
  // image is clearly visible rather than being washed out to near-black.

  const tintStyle: React.CSSProperties = {
    background: isDark
      ? "rgba(0, 0, 0, 0.34)"
      : "rgba(255, 255, 255, 0.40)",
  };

  // ── Layer 3: full-perimeter vignette ──────────────────────────────────────

  const vignetteStyle: React.CSSProperties = {
    background: isDark
      ? [
          "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(0,0,0,0.70) 100%)",
          "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(0,0,0,0.70) 100%)",
          "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(0,0,0,0.55) 100%)",
          "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)",
        ].join(", ")
      : [
          "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(200,200,210,0.40) 100%)",
          "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(200,200,210,0.40) 100%)",
          "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(200,200,210,0.30) 100%)",
          "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(200,200,210,0.30) 100%)",
        ].join(", "),
  };

  return (
    // z-[-1]: sits behind every stacking context but above <html> background.
    // Previously z-0 was sometimes out-competed by backdrop-filter siblings.
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex:     -1,
        background: isDark ? "#0b0b0f" : "#f5f5f7",
      }}
    >
      {/*
        Probe image — purely for onError detection.
        visibility:hidden + position:absolute keeps it out of layout but still
        causes the browser to attempt a real network fetch (unlike w-0/h-0
        which some engines skip). loading="lazy" avoids competing with LCP.
      */}
      {!imgFailed && (
        <img
          src={BG_IMAGE_PATH}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={{
            position:   "absolute",
            visibility: "hidden",
            width:      "1px",
            height:     "1px",
            pointerEvents: "none",
          }}
          onError={() => setImgFailed(true)}
        />
      )}

      {/* Layer 1 — background image */}
      <div className="absolute inset-0" style={imageStyle} />

      {/* Layer 2 — tint (fixed opacity, see note above) */}
      <div className="absolute inset-0" style={tintStyle} />

      {/* Layer 3 — vignette edges */}
      <div className="absolute inset-0" style={vignetteStyle} />
    </div>
  );
}

export default BackgroundOverlay;
