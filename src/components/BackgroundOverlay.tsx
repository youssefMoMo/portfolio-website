// src/components/BackgroundOverlay.tsx
//
// ─── BACKGROUND CANVAS — MAXIMUM DEPTH CINEMATIC EDITION ────────────────────
//
// Layer architecture (bottom → top):
//
//   z-index 0  ← this entire fixed wrapper (BackgroundOverlay)
//   ├── Layer 0: #050508 solid base (visible if image never loads)
//   ├── Layer 1: bg.png — the raw geometric mesh graphic (reduced to 0.72 opacity
//   │            so the base color darkens it before overlays even apply)
//   ├── Layer 2: MAIN TINT — global brightness suppression
//   │            rgba(0, 0, 0, 0.45) — brings overall image luminance down hard
//   ├── Layer 3: HEAVY TOP/BOTTOM GRADIENT — aggressive edge-to-center fade
//   │            linear-gradient(to bottom,
//   │              #050508 0%,
//   │              rgba(5,5,8,0.4) 30%,
//   │              rgba(5,5,8,0.4) 70%,
//   │              #050508 100%)
//   └── Layer 4: AGGRESSIVE RADIAL CORNER VIGNETTE
//                radial-gradient(circle,
//                  transparent 20%,
//                  rgba(0,0,0,0.85) 75%,
//                  #050508 100%)
//
//   z-index 1  ← galaxy decorative stars/nebulae (in Layout)
//   z-index 10 ← all page content (Navbar, main, Footer)
//
// Locked palette:
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
  // Opacity dialed down to 0.72 so the #050508 base already pre-darkens the
  // image before any overlay layers apply. This is the first stage of the
  // multi-layer darkening pipeline.

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
        opacity:              0.72,
      };

  // ── Layer 2: MAIN TINT ────────────────────────────────────────────────────
  // A solid rgba mask at 0.45 opacity — aggressively suppresses the overall
  // brightness of the image. This is Stage 2 of the darkening pipeline and
  // the primary reason Image 2 looks so much darker than Image 1.
  // Without this layer the image bleeds through at full luminance.

  const mainTintStyle: React.CSSProperties = {
    background: "rgba(0, 0, 0, 0.45)",
  };

  // ── Layer 3: HEAVY TOP/BOTTOM GRADIENT ───────────────────────────────────
  // Hard-black at both edges (0% and 100%), fading to a semi-transparent
  // rgba(5,5,8,0.4) at the 30–70% midband. This keeps the centre of the
  // image somewhat visible while ensuring the top (Navbar zone) and bottom
  // (Footer zone) are completely swallowed by the base background colour.
  //
  // Previous version: transparent at 15–85% → image too bright in center
  // New version: rgba(5,5,8,0.4) at 30–70% → sustained darkness throughout

  const topBottomGradientStyle: React.CSSProperties = {
    background: "linear-gradient(to bottom, #050508 0%, rgba(5,5,8,0.4) 30%, rgba(5,5,8,0.4) 70%, #050508 100%)",
  };

  // ── Layer 4: AGGRESSIVE RADIAL CORNER VIGNETTE ───────────────────────────
  // The single most impactful change for achieving the Image 2 look.
  // Previous version: transparent at 40%, rgba(5,5,8,0.65) at 100%
  //   → Too gentle. Image edges still fully visible.
  // New version:
  //   transparent at 20%  → only a small central zone is unmasked
  //   rgba(0,0,0,0.85) at 75% → heavy black well before the edge
  //   #050508 at 100% → pure base colour at screen boundary
  //
  // Effect: the background image appears to exist only in the center of the
  // screen, with the entire perimeter consumed by darkness — exactly matching
  // the cinematic framing visible in Image 2.

  const radialVignetteStyle: React.CSSProperties = {
    background: "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.85) 75%, #050508 100%)",
  };

  return (
    // ── LAYER STACK ROOT ──────────────────────────────────────────────────────
    //
    // position: fixed + inset: 0 → covers full viewport on every page,
    // including scrollable pages taller than the viewport.
    //
    // zIndex: 0 → renders above the transparent Layout root (#050508 base)
    // but strictly below all content layers (z-[1] galaxy, z-[10] content).
    //
    // pointer-events: none → never intercepts clicks or touches.
    // isolation: isolate → prevents child layers from blending outside this wrapper.
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
        is built. CSS background-image on Layer 1 is fetched only after layout —
        this 1×1 hidden img eliminates the 200–600ms gap.

        visibility: hidden + 1×1px → real network request, zero layout impact.
        display: none would cause most browsers to skip the fetch entirely.
        fetchPriority: "high" → prioritised above below-fold resources.
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

      {/* Layer 1 — bg.png at 0.72 opacity (pre-darkened by #050508 base) */}
      <div
        className="absolute inset-0"
        style={imageStyle}
      />

      {/* Layer 2 — MAIN TINT: rgba(0,0,0,0.45) global brightness suppression */}
      <div
        className="absolute inset-0"
        style={mainTintStyle}
      />

      {/* Layer 3 — HEAVY TOP/BOTTOM GRADIENT: hard black at edges, dark mid-band */}
      <div
        className="absolute inset-0"
        style={topBottomGradientStyle}
      />

      {/* Layer 4 — AGGRESSIVE RADIAL CORNER VIGNETTE: near-black from 20% outward */}
      <div
        className="absolute inset-0"
        style={radialVignetteStyle}
      />
    </div>
  );
}

// ─── Memoised export ──────────────────────────────────────────────────────────
// memo() prevents re-renders from Layout's star-pool / scroll-class mutations.
// BackgroundOverlay has no props that change during normal interaction.

export const BackgroundOverlay = memo(BackgroundOverlayInner);
export default BackgroundOverlay;
