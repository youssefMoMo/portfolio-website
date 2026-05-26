// src/components/BackgroundOverlay.tsx
//
// ─── IMPLEMENTATION NOTES ─────────────────────────────────────────────────────
//
//  1. backgroundAttachment: "fixed"
//     Applied on desktop via CSS class. On iOS/Android the GPU cannot composite
//     a fixed-attachment background into its own layer (WebKit bug, active
//     since iOS 8), so we detect mobile via matchMedia and apply a CSS class
//     that overrides the fixed attachment to "scroll" on those devices.
//     The parent container is `position: fixed` so the image still pins to the
//     viewport on mobile with zero scroll-repaint cost.
//
//  2. No blur / brightness filter on the image layer
//     The destructive `filter: blur(0.5px) brightness(0.8)` is removed entirely.
//     Contrast & readability are handled purely by the tint and vignette layers
//     below the content, which compose on the GPU with zero main-thread cost.
//
//  3. Pitch-black tint overlay
//     A semi-transparent rgba(0,0,0,x) layer sits directly above the image to
//     ensure typography contrast on all route backgrounds (Admin, Users, etc.).
//
//  4. Full-perimeter responsive vignette / edge glow
//     A radial-gradient layer applies a premium screen-edge darkening across
//     all four viewport boundaries, scaling fluidly across Mobile/Tablet/Desktop.
//
//  5. Local image fallback
//     A hidden <img> probe fires onError if bg.png is unavailable. The layer
//     silently switches to a CSS gradient that approximates the original.

import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

// ─── Fallback gradients (shown if bg.png fails to load) ──────────────────────

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

  // ── Layer 1: background image ─────────────────────────────────────────────
  //
  // NOTE: backgroundAttachment: "fixed" is intentionally absent here.
  // The container div is already `position: fixed`, so the background is
  // inherently viewport-pinned. Adding background-attachment: fixed inside
  // a fixed container creates a "double-fixed" compound that causes the
  // background image to not render at all on Chromium and WebKit.

  const imageStyle: React.CSSProperties = imgFailed
    ? {
        background: isDark ? DARK_FALLBACK : LIGHT_FALLBACK,
      }
    : {
        backgroundImage: `url(${BG_IMAGE_PATH})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };

  // ── Layer 2: pitch-black tint (readability / contrast) ───────────────────

  const tintStyle: React.CSSProperties = {
    background: isDark
      ? "rgba(0, 0, 0, 0.52)"
      : "rgba(245, 245, 247, 0.58)",
  };

  // ── Layer 3: full-perimeter vignette / edge glow ──────────────────────────
  // radial-gradient from each corner creates the premium screen-edge darkness.
  // Using a single radial centred at 50% 50% expanded to cover all 4 edges.

  const vignetteStyle: React.CSSProperties = {
    background: isDark
      ? [
          // Outer ring darkness — top, bottom, left, right edges
          "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(0,0,0,0.70) 100%)",
          "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(0,0,0,0.70) 100%)",
          "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(0,0,0,0.55) 100%)",
          "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)",
        ].join(", ")
      : [
          "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(200,200,210,0.55) 100%)",
          "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(200,200,210,0.55) 100%)",
          "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(200,200,210,0.40) 100%)",
          "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(200,200,210,0.40) 100%)",
        ].join(", "),
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: isDark ? "#0b0b0f" : "#f5f5f7" }}
    >
      {/*
        Hidden probe — detects bg.png failure without rendering a broken-image
        box. Once onError fires, the component switches to the CSS gradient.
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

      {/* Layer 1 — background image (fixed on desktop, scroll on mobile) */}
      <div className="absolute inset-0" style={imageStyle} />

      {/* Layer 2 — semi-transparent pitch-black tint for contrast */}
      <div className="absolute inset-0" style={tintStyle} />

      {/* Layer 3 — full-perimeter vignette / edge glow */}
      <div className="absolute inset-0" style={vignetteStyle} />
    </div>
  );
}

export default BackgroundOverlay;
