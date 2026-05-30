// src/components/BackgroundOverlay.tsx
//
// ─── BACKGROUND CANVAS — CINEMATIC VIGNETTE EDITION ─────────────────────────
//
// Layer architecture (bottom → top):
//
//   z-index 0  ← this entire fixed wrapper (BackgroundOverlay)
//   ├── Layer 0: #050508 solid base (fallback if image never loads)
//   ├── Layer 1: bg.png at full opacity — the raw geometric mesh graphic
//   ├── Layer 2: ultra-light tint (rgba 0,0,0,0.18) — legibility baseline
//   ├── Layer 3: CINEMATIC TOP/BOTTOM GRADIENT — dark edge masking
//   │            linear-gradient(to bottom, #050508 0%, transparent 15%,
//   │                            transparent 85%, #050508 100%)
//   └── Layer 4: RADIAL CORNER VIGNETTE — perimeter dimming
//                radial-gradient(circle, transparent 40%, rgba(5,5,8,0.65) 100%)
//
//   z-index 1  ← galaxy decorative stars/nebulae (in Layout)
//   z-index 10 ← all page content (Navbar, main, Footer)
//
// Design mandate (locked palette):
//   Brand Primary / Glows:        #6a87ce
//   Cards / Panels / Footers:     #27282a
//   Secondary Text / Desc:        #b6c2db
//   Core Headings / Icons:        #ffffff
//   Base background:              #050508

import { useState, useEffect, memo } from "react";

// ─── Fallback gradient — only shown if bg.png 404s or errors ─────────────────
const DARK_FALLBACK =
  "radial-gradient(ellipse at 60% 20%, rgba(106,135,206,0.20) 0%, rgba(39,40,42,0.40) 40%, #050508 80%)";

const BG_IMAGE_PATH = "/images/global/bg.png";

// ─── Component ────────────────────────────────────────────────────────────────

function BackgroundOverlayInner() {
  const [imgFailed, setImgFailed] = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  useEffect(() => {
    const mq       = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Layer 1: bg.png ────────────────────────────────────────────────────────
  // The actual geometric mesh graphic. Rendered at full opacity so the image
  // is visible through the vignette overlays above it.
  // backgroundAttachment: fixed on desktop (parallax-stationary on scroll).
  // Switched to scroll on mobile — iOS WebKit repaint bug with fixed bg.

  const imageStyle: React.CSSProperties = imgFailed
    ? {
        background: DARK_FALLBACK,
        opacity: 1,
      }
    : {
        backgroundImage:      `url(${BG_IMAGE_PATH})`,
        backgroundSize:       "cover",
        backgroundPosition:   "center top",
        backgroundRepeat:     "no-repeat",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
        opacity:              1,
      };

  // ── Layer 2: ultra-light tint ──────────────────────────────────────────────
  // Minimal dark wash — just enough for white text legibility over
  // the brightest areas of the image. Must NOT wash out the geometry.

  const tintStyle: React.CSSProperties = {
    background: "rgba(5, 5, 8, 0.18)",
  };

  // ── Layer 3: CINEMATIC TOP/BOTTOM GRADIENT ────────────────────────────────
  //
  // This is the PRIMARY visual depth layer requested in the design directive.
  // It creates a rich, deep black fade at both the top and bottom edges of the
  // viewport, giving the background graphic a professional "floating" look that
  // blends cleanly into the dark page chrome (Navbar, Footer).
  //
  // Breakpoints:
  //   0%   → #050508 (full black — matches html/body background)
  //   15%  → transparent (image fully visible from this point)
  //   85%  → transparent (image still fully visible)
  //   100% → #050508 (full black — blends into Footer)

  const topBottomGradientStyle: React.CSSProperties = {
    background: "linear-gradient(to bottom, #050508 0%, transparent 15%, transparent 85%, #050508 100%)",
  };

  // ── Layer 4: RADIAL CORNER VIGNETTE ───────────────────────────────────────
  //
  // A second overlay that dims the far corners and edges of the image without
  // touching the center. This is the standard cinematic vignette technique —
  // it draws the viewer's eye to the center of the composition and prevents
  // the image edges from appearing too bright or unmasked.
  //
  // circle: transparent at 40% radius (center is fully unaffected),
  // gradually becoming rgba(5,5,8,0.65) at the outer edge.

  const radialVignetteStyle: React.CSSProperties = {
    background: "radial-gradient(circle, transparent 40%, rgba(5,5,8,0.65) 100%)",
  };

  return (
    // ── LAYER STACK ROOT ──────────────────────────────────────────────────────
    //
    // position: fixed + inset: 0 → covers the full viewport on every page,
    // including scrollable pages taller than the viewport.
    //
    // zIndex: 0 → sits above the transparent Layout root but below all content
    // layers (z-[1] galaxy, z-[10] content).
    //
    // pointer-events: none → never intercepts any click or touch event.
    //
    // isolation: isolate → prevents any child layer from accidentally blending
    // with the page stacking context outside this wrapper.
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex:     0,
        background: "#050508",
        isolation:  "isolate",
      }}
    >
      {/*
        ── LCP probe image ──────────────────────────────────────────────────────
        Makes bg.png visible to the browser's preload scanner before the CSSOM
        is built. CSS background-image on Layer 1 is only fetched after layout —
        this 1×1 hidden img eliminates that 200–600ms LCP gap.

        visibility: hidden + 1×1px → real network request, zero layout impact.
        display: none would cause browsers to skip the fetch entirely.
        fetchPriority: "high" → bumps this above other resource fetches.
      */}
      {!imgFailed && (
        <img
          src={BG_IMAGE_PATH}
          alt=""
          aria-hidden="true"
          loading="eager"
          // @ts-expect-error — fetchPriority not yet in @types/react
          fetchPriority="high"
          decoding="async"
          style={{
            position:      "absolute",
            visibility:    "hidden",
            width:         "1px",
            height:        "1px",
            pointerEvents: "none",
          }}
          onError={() => setImgFailed(true)}
        />
      )}

      {/* Layer 1 — bg.png (or fallback gradient) at full opacity */}
      <div
        className="absolute inset-0"
        style={imageStyle}
      />

      {/* Layer 2 — ultra-light tint for text legibility */}
      <div
        className="absolute inset-0"
        style={tintStyle}
      />

      {/* Layer 3 — CINEMATIC TOP/BOTTOM DARK GRADIENT */}
      {/* Masks the top and bottom 15% of the image with #050508 */}
      {/* Creates professional depth: image appears to float in the dark canvas */}
      <div
        className="absolute inset-0"
        style={topBottomGradientStyle}
      />

      {/* Layer 4 — RADIAL CORNER VIGNETTE */}
      {/* Dims the outer perimeter without touching the center composition */}
      <div
        className="absolute inset-0"
        style={radialVignetteStyle}
      />
    </div>
  );
}

// ─── Memoised export ──────────────────────────────────────────────────────────
// memo() prevents re-renders from Layout's star-pool / scroll-class mutations.
// BackgroundOverlay has no state that changes during normal interaction
// (only isMobile changes on viewport resize, which is cheap).

export const BackgroundOverlay = memo(BackgroundOverlayInner);
export default BackgroundOverlay;
