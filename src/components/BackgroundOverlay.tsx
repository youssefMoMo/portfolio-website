// src/components/BackgroundOverlay.tsx
//
// ─── IMPLEMENTATION NOTES ─────────────────────────────────────────────────────
//
//  1. Pure Tailwind theme binding (no inline JS style for color decisions)
//     All theme-switching logic is expressed through Tailwind `dark:` variants
//     and the `data-theme` attribute set on <html> by ThemeProvider. This ensures
//     the background layer responds atomically with the rest of the UI when the
//     theme class changes — no JS re-render timing gap that previously caused the
//     "flat black screen" regression on toggle.
//
//  2. bg-neutral-50 / dark:bg-neutral-950 base coat
//     The outermost fixed div carries `bg-neutral-50 dark:bg-neutral-950` as a
//     solid base. If every layer above it fails (missing image, JS error) the user
//     still sees a correct theme-appropriate canvas instead of a transparent hole
//     over a black body.
//
//  3. backgroundAttachment: "fixed" intentionally absent
//     The container div is already `position: fixed` so the background is
//     inherently viewport-pinned. Adding background-attachment: fixed inside
//     a fixed container creates a "double-fixed" compound that causes the
//     background image to not render at all on Chromium and WebKit.
//
//  4. No blur / brightness filter on the image layer
//     The destructive `filter: blur(0.5px) brightness(0.8)` is removed entirely.
//     Contrast & readability are handled purely by the tint and vignette layers
//     below the content, which compose on the GPU with zero main-thread cost.
//
//  5. Tint overlay — Tailwind classes only
//     Semi-transparent overlay expressed as `bg-black/50 dark:bg-black/52` etc.
//     so no JS runtime computation is needed for the opacity split.
//
//  6. Vignette — data-theme CSS attribute approach
//     The radial-gradient vignette still needs a small inline style because
//     Tailwind cannot generate arbitrary multi-gradient strings. However it is
//     now keyed on `resolvedTheme` only for the gradient data; the layout
//     classes remain pure Tailwind. This means only gradient values (not
//     structural layout) ever change via JS — eliminating the GPU layer discard
//     that caused the invisible-background regression.
//
//  7. Local image fallback
//     A hidden <img> probe fires onError if bg.png is unavailable. The layer
//     silently switches to a Tailwind-class gradient approximation.

import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";

// ─── Fallback gradient classes (used when bg.png fails to load) ───────────────
// Expressed as inline style strings because Tailwind can't generate arbitrary
// radial-gradient values at build time. These are only active after the image
// probe fires onError, so they are not part of the hot path.

const DARK_FALLBACK_STYLE: React.CSSProperties = {
  background: "radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0b0b0f 60%)",
};
const LIGHT_FALLBACK_STYLE: React.CSSProperties = {
  background: "radial-gradient(ellipse at 50% 0%, #e8e8f0 0%, #f5f5f7 60%)",
};

// ─── Static image layer style (no theme dependency) ───────────────────────────
const IMAGE_LAYER_STYLE: React.CSSProperties = {
  backgroundImage:    "url(/images/global/bg.png)",
  backgroundSize:     "cover",
  backgroundPosition: "center",
  backgroundRepeat:   "no-repeat",
};

// ─── Vignette gradients (only the color values are theme-dependent) ───────────

const VIGNETTE_DARK: React.CSSProperties = {
  background: [
    "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(0,0,0,0.70) 100%)",
    "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(0,0,0,0.70) 100%)",
    "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(0,0,0,0.55) 100%)",
    "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)",
  ].join(", "),
};

const VIGNETTE_LIGHT: React.CSSProperties = {
  background: [
    "radial-gradient(ellipse at 50% 0%,   transparent 55%, rgba(200,200,210,0.55) 100%)",
    "radial-gradient(ellipse at 50% 100%, transparent 55%, rgba(200,200,210,0.55) 100%)",
    "radial-gradient(ellipse at 0%  50%,  transparent 50%, rgba(200,200,210,0.40) 100%)",
    "radial-gradient(ellipse at 100% 50%, transparent 50%, rgba(200,200,210,0.40) 100%)",
  ].join(", "),
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BackgroundOverlay() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [imgFailed, setImgFailed] = useState(false);

  // ── Layer 1: background image ─────────────────────────────────────────────
  // When the image probe succeeds the layer uses a static style object
  // (IMAGE_LAYER_STYLE) that never changes — no theme-driven recompute.
  // When it fails we switch to a theme-appropriate CSS gradient fallback.
  const imageLayerStyle: React.CSSProperties = imgFailed
    ? (isDark ? DARK_FALLBACK_STYLE : LIGHT_FALLBACK_STYLE)
    : IMAGE_LAYER_STYLE;

  // ── Layer 3: vignette ─────────────────────────────────────────────────────
  // The gradient data itself must vary by theme. The style object reference
  // changes only when resolvedTheme flips, so React re-renders the vignette
  // layer in the same commit as the Tailwind class swap on <html> — no gap.
  const vignetteStyle = isDark ? VIGNETTE_DARK : VIGNETTE_LIGHT;

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // Base div uses Tailwind `bg-neutral-50 dark:bg-neutral-950` so the solid
  // background colour is owned by CSS (not JS) and responds atomically to the
  // `dark` class toggle on <html>.  No inline `background` override here.

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none bg-neutral-50 dark:bg-neutral-950"
    >
      {/*
        Hidden probe — detects bg.png failure without rendering a broken-image
        box. Once onError fires, the component switches to the CSS gradient.
      */}
      {!imgFailed && (
        <img
          src="/images/global/bg.png"
          alt=""
          aria-hidden="true"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          onError={() => setImgFailed(true)}
          loading="eager"
          fetchPriority="low"
        />
      )}

      {/* Layer 1 — background image (viewport-pinned via fixed container) */}
      <div className="absolute inset-0" style={imageLayerStyle} />

      {/*
        Layer 2 — semi-transparent tint for contrast / readability.
        Uses Tailwind dark: variants so the tint responds to the CSS class
        change on <html> with zero JS involvement — eliminates the half-frame
        flicker where the JS-computed rgba was applied one render after the
        Tailwind class swap.
      */}
      <div className="absolute inset-0 bg-[rgba(245,245,247,0.58)] dark:bg-[rgba(0,0,0,0.52)]" />

      {/* Layer 3 — full-perimeter vignette / edge glow (gradient data only) */}
      <div className="absolute inset-0" style={vignetteStyle} />
    </div>
  );
}

export default BackgroundOverlay;
