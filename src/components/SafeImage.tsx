// src/components/SafeImage.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  ENCODING COMPLIANCE FIX
//    • Old: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
//      The `utf8` parameter is non-standard and rejected by strict browsers
//      and Content-Security-Policy parsers.
//    • New: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
//      RFC 2397 (the data URI spec) defines the parameter as `charset=<value>`.
//      This form is accepted universally, including by Safari and Firefox CSP.
//
//  CLS SAFETY
//    • `width` and `height` are forwarded to the underlying <img> so the
//      browser can reserve layout space before the image loads — preventing
//      Cumulative Layout Shift.
//    • When `fallbackIcon` is rendered, the wrapper `<span>` inherits the
//      same className/style as the <img> so the box size never changes.
//
//  FALLBACK CHAIN
//    primary src → fallback URL → fallbackIcon (if provided) → inline SVG placeholder
//
//  BOTH IMPORT STYLES SUPPORTED
//    import SafeImage from "@/components/SafeImage";        // default
//    import { SafeImage } from "@/components/SafeImage";    // named

import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * 1 × 1 transparent PNG — absolute last resort when all image paths fail
 * and no fallbackIcon is provided. Invisible but layout-safe.
 */
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// ─── Internal SVG placeholder ─────────────────────────────────────────────────

/**
 * Generates an inline SVG data URI as a high-res placeholder for broken images.
 *
 * FIX: uses `charset=utf-8` (RFC 2397-compliant) instead of the non-standard
 * `utf8` token. The `encodeURIComponent` call makes the payload safe for the
 * `,`-separated data URI body regardless of the charset declaration.
 */
function svgPlaceholder(label = "", w = 600, h = 400): string {
  const safe = String(label || "Image")
    .replace(/[<>&"']/g, "")
    .slice(0, 40);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='#1a1a1f'/>` +
    `<rect x='1' y='1' width='${w - 2}' height='${h - 2}' fill='none' stroke='#2a2a32' stroke-width='2' stroke-dasharray='8 8'/>` +
    `<text x='50%' y='50%' fill='#5a5a6a' font-family='system-ui,sans-serif' font-size='20' ` +
    `text-anchor='middle' dominant-baseline='middle'>${safe}</text>` +
    `</svg>`;
  // RFC 2397 — charset parameter must be `charset=<encoding>` not bare `utf8`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── Path normalisation ───────────────────────────────────────────────────────

/**
 * Normalises a src value to an absolute-or-root-relative URL string.
 * Returns null for falsy or whitespace-only inputs.
 */
function normalize(src: unknown): string | null {
  if (!src) return null;
  if (typeof src !== "string") return src as string;
  const t = src.trim();
  if (!t) return null;
  if (/^(https?:|data:|blob:)/i.test(t)) return t;
  if (t.startsWith("/")) return t;
  // Bare or `./` relative path — normalise to site root
  return "/" + t.replace(/^\.{1,2}\/?/, "");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string;
  alt?: string;
  /**
   * Primary fallback URL — tried if `src` fails.
   * Defaults to `/images/global/fallback.png`.
   */
  fallback?: string;
  /**
   * ReactNode rendered inside a `<span>` wrapper when both `src` and `fallback`
   * have failed to load. Useful for icon/initials placeholders.
   */
  fallbackIcon?: ReactNode;
  /**
   * Class applied to the `<span>` wrapper when `fallbackIcon` is rendered.
   * Falls back to `className` if omitted.
   */
  wrapperClassName?: string;
  /**
   * Alias of `wrapperClassName` — kept for backward compatibility with
   * components that previously used SmartImage's `containerClassName` prop.
   */
  containerClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SafeImage({
  src,
  alt = "",
  fallback = "/images/global/fallback.png",
  fallbackIcon,
  wrapperClassName,
  containerClassName,
  loading  = "lazy",
  decoding = "async",
  onError,
  onLoad,
  className,
  style,
  width,
  height,
  ...rest
}: SafeImageProps) {
  /**
   * Inline SVG placeholder — memoised so it only regenerates when alt/dimensions
   * change, not on every render. Used at the bottom of the fallback chain.
   */
  const placeholder = useMemo(
    () => svgPlaceholder(alt, Number(width) || 600, Number(height) || 400),
    [alt, width, height],
  );

  const initial = normalize(src) ?? fallback ?? placeholder;

  const [current, setCurrent] = useState<string>(initial);
  const [stage, setStage] = useState<
    "primary" | "fallback" | "placeholder" | "failed"
  >("primary");

  // Reset when src prop changes (e.g. carousel navigating to a different item)
  useEffect(() => {
    setCurrent(normalize(src) ?? fallback ?? placeholder);
    setStage("primary");
  }, [src, fallback, placeholder]);

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(e);

    if (stage === "primary" && fallback && current !== fallback) {
      // Stage 1 → try the fallback URL
      setCurrent(fallback);
      setStage("fallback");
      return;
    }

    if (stage === "fallback") {
      if (fallbackIcon) {
        // Stage 2 → render the ReactNode icon if the caller provided one
        setStage("failed");
        return;
      }
      // Stage 2 → inline SVG placeholder (always renders, never 404s)
      if (current !== placeholder) {
        setCurrent(placeholder);
        setStage("placeholder");
        return;
      }
    }

    // Absolute last resort — transparent pixel (invisible, layout-safe)
    if (stage !== "placeholder" && current !== TRANSPARENT_PIXEL) {
      setCurrent(TRANSPARENT_PIXEL);
    }
  };

  // ── Render fallback ReactNode (icon / initials) ───────────────────────────

  if (stage === "failed" && fallbackIcon) {
    const wrapClass = wrapperClassName ?? containerClassName ?? className ?? "";
    return (
      <span
        className={wrapClass}
        style={style}
        aria-label={alt || undefined}
        role={alt ? "img" : undefined}
      >
        {fallbackIcon}
      </span>
    );
  }

  // ── Standard <img> with progressive fallback chain ────────────────────────

  return (
    <img
      src={current}
      alt={alt}
      loading={loading}
      decoding={decoding}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
      onLoad={onLoad}
      {...rest}
    />
  );
}

export default SafeImage;
