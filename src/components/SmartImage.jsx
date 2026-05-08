import { useState, useEffect } from 'react';

/**
 * SmartImage — drop-in <img> replacement.
 *
 * Behavior:
 *  - Resolves Vite/Vercel public-relative paths correctly
 *    (a leading "/" path resolves against site root in both dev and prod)
 *  - On error, falls back to `fallback` prop, then to a transparent pixel
 *  - Lazy loads + async decodes by default
 *  - Resets when src prop changes
 */

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function normalize(src) {
  if (!src) return null;
  if (typeof src !== 'string') return src;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  // Bare or "./..." — normalize to public root
  return '/' + trimmed.replace(/^\.?\/?/, '');
}

export default function SmartImage({
  src,
  alt = '',
  fallback = '/images/placeholder.png',
  loading = 'lazy',
  decoding = 'async',
  onError,
  onLoad,
  className,
  style,
  ...rest
}) {
  const initial = normalize(src) || fallback || TRANSPARENT_PIXEL;
  const [currentSrc, setCurrentSrc] = useState(initial);
  const [stage, setStage] = useState('primary');

  useEffect(() => {
    const next = normalize(src) || fallback || TRANSPARENT_PIXEL;
    setCurrentSrc(next);
    setStage('primary');
  }, [src, fallback]);

  const handleError = (e) => {
    onError?.(e);
    if (stage === 'primary' && fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      setStage('fallback');
      return;
    }
    if (stage !== 'pixel' && currentSrc !== TRANSPARENT_PIXEL) {
      setCurrentSrc(TRANSPARENT_PIXEL);
      setStage('pixel');
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      onError={handleError}
      onLoad={onLoad}
      {...rest}
    />
  );
}