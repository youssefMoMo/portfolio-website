/**
 * imageFallback.ts — install once in main.tsx to add global onerror
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
 * Safe: only mutates each <img> once (via data-fallback-stage), never loops.
 *
 * svgPlaceholder() is exported for programmatic use (e.g. contentManager.ts)
 * so the entire app has a single, consistent broken-image recovery path.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const FALLBACK_PRIMARY = "/images/placeholder.png";

// ─── SVG character-escape map ────────────────────────────────────────────────
// Prevents catastrophic SVG layout-breaking if callers pass strings containing
// XML special characters (e.g. <script> tags, & entities, attribute delimiters).
const SVG_ESCAPE_MAP: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
} as const;

/**
 * Sanitise a string for safe embedding inside an SVG text node or attribute.
 * Escapes the five XML/HTML characters that can break SVG structure or allow
 * injection: & < > " '
 */
function sanitiseSvgString(raw: string): string {
  return raw.replace(/[&<>"']/g, (char: string): string => SVG_ESCAPE_MAP[char] ?? char);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an inline SVG data URI suitable for use as an <img> src fallback.
 *
 * @param label  - Text label to render inside the placeholder box.
 *                 Sanitised against XML injection before embedding.
 * @param width  - Viewbox width in px (default 600).
 * @param height - Viewbox height in px (default 400).
 * @returns      A `data:image/svg+xml;...` URI string.
 */
export function svgPlaceholder(
  label: string = "Image",
  width: number = 600,
  height: number = 400,
): string {
  // Normalise, sanitise, and truncate the label — defensive against undefined/null
  // callers (even though TypeScript enforces the type at compile time, runtime
  // cross-boundary calls may still pass unexpected values).
  const safe: string = sanitiseSvgString(
    String(label != null ? label : "Image").trim() || "Image",
  ).slice(0, 40);

  const w: number = Math.max(1, Math.round(width));
  const h: number = Math.max(1, Math.round(height));

  const svg: string =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='#1a1a1f'/>` +
    `<text ` +
      `x='50%' y='50%' ` +
      `fill='#5a5a6a' ` +
      `font-family='system-ui,sans-serif' ` +
      `font-size='20' ` +
      `text-anchor='middle' ` +
      `dominant-baseline='middle'` +
    `>${safe}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── installImageFallback options type ───────────────────────────────────────

export interface ImageFallbackOptions {
  /** Override the primary fallback image path. Defaults to /images/placeholder.png */
  fallback?: string;
}

// ─── Installation ─────────────────────────────────────────────────────────────

let installed = false;

/**
 * Install a document-level error capture listener that automatically
 * recovers broken <img> elements through a two-stage fallback chain:
 *
 *   Stage 1 (primary)     → options.fallback  (a real image file)
 *   Stage 2 (placeholder) → svgPlaceholder()  (inline SVG, never fails)
 *
 * Idempotent: safe to call multiple times (React 18 StrictMode double-invoke).
 */
export function installImageFallback(options: ImageFallbackOptions = {}): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const fallback: string = options.fallback ?? FALLBACK_PRIMARY;

  document.addEventListener(
    "error",
    (e: Event): void => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;

      // Avoid infinite loops: advance through stages once per element.
      const stage: string = target.dataset.fallbackStage ?? "primary";

      if (stage === "primary" && target.src !== fallback) {
        target.dataset.fallbackStage = "fallback";
        target.src = fallback;
        return;
      }

      if (stage !== "placeholder") {
        target.dataset.fallbackStage = "placeholder";
        target.src = svgPlaceholder(
          target.alt,
          target.naturalWidth  > 0 ? target.naturalWidth  : 600,
          target.naturalHeight > 0 ? target.naturalHeight : 400,
        );
      }
    },
    true, // capture phase — `error` does not bubble from <img>
  );
}
