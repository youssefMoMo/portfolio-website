/**
 * imageFallback.js — install once in main.tsx / main.jsx to add global onerror
 * fallback to every <img> in the app, without changing existing components.
 *
 * Usage in src/main.tsx:
 *   import { installImageFallback } from '@/lib/imageFallback';
 *   installImageFallback();
 *
 * What it does:
 *   - Listens at document level for image errors (capture phase, since `error`
 *     does not bubble normally)
 *   - On error, sets src to the configured fallback once
 *   - If the fallback also fails, swaps to an inline SVG placeholder
 *
 * Safe: only mutates each <img> once, never loops.
 */

const FALLBACK_PRIMARY = "/images/placeholder.png";

function svgPlaceholder(label = "Image", w = 600, h = 400) {
  const safe = String(label || "Image")
    .replace(/[<>&"']/g, "")
    .slice(0, 40);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='#1a1a1f'/>` +
    `<text x='50%' y='50%' fill='#5a5a6a' font-family='system-ui,sans-serif' font-size='20' text-anchor='middle' dominant-baseline='middle'>${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let installed = false;

export function installImageFallback(options = {}) {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const fallback = options.fallback || FALLBACK_PRIMARY;

  document.addEventListener(
    "error",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLImageElement)) return;
      // Avoid infinite loops: tag the element after each step
      const stage = t.dataset.fallbackStage || "primary";

      if (stage === "primary" && t.src !== fallback) {
        t.dataset.fallbackStage = "fallback";
        t.src = fallback;
        return;
      }
      if (stage !== "placeholder") {
        t.dataset.fallbackStage = "placeholder";
        t.src = svgPlaceholder(
          t.alt,
          t.naturalWidth || 600,
          t.naturalHeight || 400,
        );
      }
    },
    true, // capture phase — `error` doesn't bubble
  );
}
