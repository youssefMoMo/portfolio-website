import { useState, useEffect, useMemo, type ReactNode, type ImgHTMLAttributes, type SyntheticEvent } from "react";

/**
 * SafeImage — drop-in <img> replacement that survives missing/broken sources.
 *
 * Both import styles work:
 *   import SafeImage from "@/components/SafeImage";
 *   import { SafeImage } from "@/components/SafeImage";
 *
 * Props beyond standard <img>:
 *   - fallback: string         primary fallback URL (default: /images/fallback.png)
 *   - fallbackIcon: ReactNode  rendered when both src AND fallback fail (replaces the <img>)
 *   - wrapperClassName: string class applied to the wrapper element when fallbackIcon is rendered
 *   - containerClassName: string alias of wrapperClassName for backward-compat
 */

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function svgPlaceholder(label = "", w = 600, h = 400): string {
  const safe = String(label || "Image")
    .replace(/[<>&"']/g, "")
    .slice(0, 40);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' fill='#1a1a1f'/>` +
    `<rect x='1' y='1' width='${w - 2}' height='${h - 2}' fill='none' stroke='#2a2a32' stroke-width='2' stroke-dasharray='8 8'/>` +
    `<text x='50%' y='50%' fill='#5a5a6a' font-family='system-ui,sans-serif' font-size='20' text-anchor='middle' dominant-baseline='middle'>${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalize(src: unknown): string | null {
  if (!src) return null;
  if (typeof src !== "string") return src as string;
  const t = src.trim();
  if (!t) return null;
  if (/^(https?:|data:|blob:)/i.test(t)) return t;
  if (t.startsWith("/")) return t;
  return "/" + t.replace(/^\.{1,2}\/?/, "");
}

export interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string;
  alt?: string;
  fallback?: string;
  /** Optional element rendered when both src and fallback fail to load. */
  fallbackIcon?: ReactNode;
  /** Class on the fallback wrapper (used when fallbackIcon renders). */
  wrapperClassName?: string;
  /** Alias of wrapperClassName for backward-compat. */
  containerClassName?: string;
}

export function SafeImage({
  src,
  alt = "",
  fallback = "/images/fallback.png",
  fallbackIcon,
  wrapperClassName,
  containerClassName,
  loading = "lazy",
  decoding = "async",
  onError,
  onLoad,
  className,
  style,
  width,
  height,
  ...rest
}: SafeImageProps) {
  const placeholder = useMemo(
    () => svgPlaceholder(alt, Number(width) || 600, Number(height) || 400),
    [alt, width, height],
  );

  const initial = normalize(src) || fallback || placeholder;
  const [current, setCurrent] = useState<string>(initial);
  const [stage, setStage] = useState<"primary" | "fallback" | "placeholder" | "failed">("primary");

  useEffect(() => {
    setCurrent(normalize(src) || fallback || placeholder);
    setStage("primary");
  }, [src, fallback, placeholder]);

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(e);
    if (stage === "primary" && fallback && current !== fallback) {
      setCurrent(fallback);
      setStage("fallback");
      return;
    }
    if (stage === "fallback" && current !== placeholder) {
      // If user supplied a fallbackIcon, mark as failed so we render it instead of an <img>
      if (fallbackIcon) {
        setStage("failed");
        return;
      }
      setCurrent(placeholder);
      setStage("placeholder");
      return;
    }
    if (stage !== "placeholder" && current !== TRANSPARENT_PIXEL) {
      setCurrent(TRANSPARENT_PIXEL);
    }
  };

  // Render the fallback ReactNode (e.g. an icon/initials) when both src and fallback have failed
  if (stage === "failed" && fallbackIcon) {
    const wrapClass = wrapperClassName ?? containerClassName ?? className ?? "";
    return (
      <span className={wrapClass} style={style} aria-label={alt} role="img">
        {fallbackIcon}
      </span>
    );
  }

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
