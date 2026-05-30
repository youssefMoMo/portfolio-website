// src/components/BackgroundOverlay.tsx
//
// ─── BACKGROUND CANVAS — DEFINITIVE FIX ──────────────────────────────────────
//
// Root cause of flat-black rendering (Image 1 vs Image 2):
//
//   The previous implementation placed the BackgroundOverlay wrapper at
//   zIndex: -1. This meant it rendered BEHIND the Layout root div's stacking
//   context. Because Layout's root div carried `bg-background` (solid #050508),
//   that opaque layer completely painted over the bg.png image, making the
//   entire background appear flat black. The image was loading correctly —
//   it was simply buried under an opaque solid-color div.
//
// Fix architecture:
//   • BackgroundOverlay wrapper: zIndex 0 (no longer behind anything)
//   • Layout root div: `bg-transparent` (no background color — the overlay
//     IS the background)
//   • Tint: reduced to rgba(0,0,0,0.22) so the image geometry is fully visible
//   • Vignette: softened edges, not crushing the center
//   • No mix-blend-mode, no dynamic masking, no opacity animation on load
//   • The image layer itself: opacity: 1, no filter dimming
//
// New colour palette (per design mandate):
//   --primary / accent:  #6a87ce  (brilliant blue)
//   --card / panels:     #27282a  (custom slate-gray)
//   --muted-fg:          #b6c2db  (cool lavender-gray)
//   --background:        #050508  (absolute base behind image)

import { useState, useEffect, memo } from "react";

// ─── Fallback gradient — only shown if bg.png 404s or errors ─────────────────
// Uses the new palette: deep base + blue-purple atmosphere
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

  // ── Layer 0: absolute base colour ──────────────────────────────────────────
  // This is the HTML/body-level background colour visible in the very rare
  // case where neither the image nor the CSS gradient has loaded yet.
  // Sits at the bottom of the stack inside this component.

  // ── Layer 1: bg.png ────────────────────────────────────────────────────────
  // The actual geometric/abstract visual asset from the design reference.
  // opacity: 1 — no dimming whatsoever at the image layer.
  // backgroundAttachment: fixed on desktop so the image is parallax-stationary
  // during scroll. Switched to scroll on mobile (iOS WebKit repaint issue).

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
        // No filter, no mix-blend-mode, no brightness reduction.
        // The image must render at 100% fidelity.
      };

  // ── Layer 2: ultra-light tint ─────────────────────────────────────────────
  // Just enough to ensure body text (#ffffff) is legible over the brighter
  // areas of the image. Must NOT be dark enough to wash out the geometry.
  // Previous value was 0.38 — that was too heavy. 0.18 is the sweet spot.

  const tintStyle: React.CSSProperties = {
    background: "rgba(5, 5, 8, 0.18)",
    // No backdropFilter here — we don't want to blur the background image
  };

  // ── Layer 3: perimeter vignette ───────────────────────────────────────────
  // Soft edge-darkening only. Does NOT darken the centre of the screen.
  // Previous implementation had aggressive 0.72 opacity — was suffocating
  // the image in the centre. New values: transparent at 60%+ inward.

  const vignetteStyle: React.CSSProperties = {
    background: [
      "radial-gradient(ellipse at 50% 0%,   transparent 60%, rgba(5,5,8,0.55) 100%)",
      "radial-gradient(ellipse at 50% 100%, transparent 60%, rgba(5,5,8,0.60) 100%)",
      "radial-gradient(ellipse at 0%  50%,  transparent 55%, rgba(5,5,8,0.40) 100%)",
      "radial-gradient(ellipse at 100% 50%, transparent 55%, rgba(5,5,8,0.40) 100%)",
    ].join(", "),
  };

  return (
    // ── CRITICAL FIX: zIndex is 0, NOT -1 ────────────────────────────────────
    //
    // When zIndex was -1, this element rendered behind the Layout root div's
    // stacking context. Layout's root had `bg-background` (#050508 solid),
    // which completely painted over the background image — making it invisible.
    //
    // At zIndex: 0, this fixed overlay sits ABOVE the Layout root background
    // (which is now transparent) but BELOW the content z-[10] layer.
    // The pointer-events: none ensures it never intercepts clicks.
    //
    // position: fixed + inset: 0 = full viewport coverage on every page,
    // including pages taller than the viewport (scrollable pages).
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex:     0,
        background: "#050508",   // absolute base — visible only if all layers fail
        isolation:  "isolate",   // prevent child layers from blending with page content
      }}
    >
      {/*
        ── LCP probe image ────────────────────────────────────────────────────
        Makes bg.png visible to the browser's preload scanner immediately on
        HTML parse, before the CSSOM is built. The CSS background-image on
        Layer 1 below is only fetched AFTER layout — this probe eliminates
        that 200-600ms gap by requesting the same URL at fetchPriority="high".

        visibility: hidden + 1×1px: triggers a real network request without
        appearing in the layout or accessibility tree. display:none would
        cause most browsers to skip the fetch entirely.

        The onError handler bridges to the DARK_FALLBACK gradient so there
        is never a broken-image icon or blank canvas.
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

      {/* Layer 1 — bg.png at full opacity */}
      <div
        className="absolute inset-0"
        style={imageStyle}
      />

      {/* Layer 2 — ultra-light tint (legibility only, not dimming) */}
      <div
        className="absolute inset-0"
        style={tintStyle}
      />

      {/* Layer 3 — soft perimeter vignette */}
      <div
        className="absolute inset-0"
        style={vignetteStyle}
      />
    </div>
  );
}

// ─── Memoised export ──────────────────────────────────────────────────────────
// memo() prevents re-renders on Layout's star-pool / scroll-class mutations,
// which happen frequently. BackgroundOverlay has no state that changes during
// normal interaction, so memoisation is free performance.

export const BackgroundOverlay = memo(BackgroundOverlayInner);
export default BackgroundOverlay;
