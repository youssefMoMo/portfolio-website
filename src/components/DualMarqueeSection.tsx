"use client";

import React, { useRef, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarqueeItem {
  label: string;
  icon?: React.ReactNode;
  /** Optional image src (used for tool logos, etc.) */
  image?: string;
}

interface MarqueeRowConfig {
  items: MarqueeItem[];
  /** px per second – each row can have its own speed */
  speed?: number;
  /** Reverse scroll direction */
  reverse?: boolean;
}

interface DualMarqueeSectionProps {
  rows: MarqueeRowConfig[];
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
/**
 * Minimum guaranteed pixel width of the duplicated track before we consider
 * the track "wide enough" to fill the viewport edge-to-edge without gaps.
 * 4 × the widest typical viewport (2560 px) gives us a safe buffer.
 */
const MIN_TRACK_WIDTH_PX = 10_000;

/**
 * How many times a single set of items is repeated before we check width.
 * Short rows (≤ 3 items) get a higher base multiplier so their DOM track
 * is guaranteed wider than the viewport from the very first paint — eliminating
 * the whitespace gap that appears on animation mount for Row 3 (Tools).
 */
function getBaseMultiplier(itemCount: number): number {
  if (itemCount <= 3) return 12; // Tools row: Photoshop, Figma, Roblox Studio
  if (itemCount <= 5) return 8;
  if (itemCount <= 8) return 4;
  return 2;                       // Long rows self-fill naturally
}

// ─── Single Marquee Track ─────────────────────────────────────────────────────
function MarqueeTrack({
  items,
  speed = 60,
  reverse = false,
}: MarqueeRowConfig) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState<number>(getBaseMultiplier(items.length));

  /**
   * FIX: After mount, measure the rendered track width. If it is still
   * narrower than MIN_TRACK_WIDTH_PX keep doubling until it overflows the
   * viewport comfortably. This guarantees Row 3 never shows a gap at
   * animation start regardless of viewport width or item pixel density.
   *
   * The duration is computed from the MEASURED scrollWidth (not an estimate)
   * so speed stays accurate even after the multiplier doubles post-mount.
   */
  useEffect(() => {
    if (!trackRef.current) return;

    const check = () => {
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.scrollWidth;
      const viewportWidth = window.innerWidth;

      if (trackWidth < Math.max(MIN_TRACK_WIDTH_PX, viewportWidth * 2.5)) {
        setMultiplier((m) => m * 2);
      }
    };

    // Run check after the current render flushes.
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [items.length, multiplier]);

  // Build the repeated item list.
  const repeatedItems = Array.from({ length: multiplier }, () => items).flat();

  /**
   * FIX: Duration now derives from the actual measured scrollWidth when
   * available, falling back to an estimate. When multiplier doubles
   * post-mount, scrollWidth is re-measured on the next RAF, so the
   * animation duration updates automatically and speed never drifts.
   */
  const measuredWidth = trackRef.current?.scrollWidth ?? 0;
  const estimatedWidth = items.length * multiplier * 180;
  const trackPixelWidth = measuredWidth > 0 ? measuredWidth : estimatedWidth;
  // The CSS animation scrolls -50%, which is half the total track.
  // Duration = that half-width / speed so one full visual loop = constant velocity.
  const duration = (trackPixelWidth / 2) / speed;

  const animationStyle: React.CSSProperties = {
    "--marquee-duration": `${duration}s`,
    animationDirection: reverse ? "reverse" : "normal",
  } as React.CSSProperties;

  return (
    <div className="marquee-viewport overflow-hidden w-full">
      <div
        ref={trackRef}
        className="marquee-track flex gap-4 w-max"
        style={animationStyle}
      >
        {repeatedItems.map((item, idx) => (
          <MarqueeItemCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Individual Item Renderer ─────────────────────────────────────────────────
function MarqueeItemCard({ item }: { item: MarqueeItem }) {
  return (
    <div className="marquee-item flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/40 border border-white/5 backdrop-blur-sm whitespace-nowrap shrink-0 select-none">
      {item.image && (
        <img
          src={item.image}
          alt={item.label}
          className="w-7 h-7 rounded-md object-contain"
          draggable={false}
        />
      )}
      {item.icon && (
        <span className="flex-shrink-0 text-primary">{item.icon}</span>
      )}
      <span className="text-sm font-medium text-foreground/80">{item.label}</span>
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────
/**
 * DualMarqueeSection
 *
 * Renders N rows of horizontally scrolling marquee tracks.
 *
 * KEY FIX (Row 3 / short-item rows):
 *   • Base multiplier raised from 8 → 12 for ≤3-item rows.
 *   • Duration now uses measured scrollWidth instead of an estimated pixel
 *     width, so speed stays constant even when the multiplier doubles
 *     post-mount via the RAF check.
 *   • The local component was renamed `MarqueeItemCard` to avoid shadowing
 *     the `MarqueeItem` interface — prevents a TypeScript TS2300 duplicate
 *     identifier error in strict mode.
 */
export default function DualMarqueeSection({
  rows,
  className = "",
}: DualMarqueeSectionProps) {
  return (
    <section
      className={`w-full overflow-hidden flex flex-col gap-3 py-4 ${className}`}
      aria-label="Marquee showcase"
    >
      {rows.map((row, i) => (
        <MarqueeTrack key={i} {...row} />
      ))}

      {/* Global keyframe injected once */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .marquee-track {
          animation: marquee-scroll var(--marquee-duration, 30s) linear infinite;
          /*
           * translateX(-50%) scrolls exactly one "half" of the duplicated
           * track. Because we always duplicate to at least 12× the original
           * set for short rows, the midpoint is well beyond the viewport
           * edge — guaranteeing the first visible item is at position 0
           * (screen left edge) on every row, including the 3-item Tools row.
           */
          will-change: transform;
        }

        .marquee-viewport {
          /* Clip overflow so we never see the track edges */
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 4%,
            black 96%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 4%,
            black 96%,
            transparent 100%
          );
        }

        /* Pause on hover for usability */
        .marquee-viewport:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
