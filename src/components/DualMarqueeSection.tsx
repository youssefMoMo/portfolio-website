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
 * Short rows (≤ 4 items) get a much higher base multiplier so their DOM track
 * is guaranteed wider than the viewport from the very first paint.
 */
function getBaseMultiplier(itemCount: number): number {
  if (itemCount <= 3) return 8;   // Tools row (Photoshop, Figma, Roblox Studio)
  if (itemCount <= 5) return 6;
  if (itemCount <= 8) return 4;
  return 2;                        // Long rows self-fill naturally
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
   * After mount, measure the rendered track width. If it is still narrower than
   * MIN_TRACK_WIDTH_PX (can happen on ultra-wide monitors) keep doubling until
   * it overflows the viewport comfortably. This ensures Row 3 never shows a gap.
   */
  useEffect(() => {
    if (!trackRef.current) return;

    let m = getBaseMultiplier(items.length);
    // Each iteration of the loop checks the *rendered* track width.
    // We loop synchronously so React re-renders before the browser paints.
    const check = () => {
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.scrollWidth;
      const viewportWidth = window.innerWidth;

      // We need at least 2 × viewport width so the seamless loop never exposes
      // the end of the track during animation.
      if (trackWidth < Math.max(MIN_TRACK_WIDTH_PX, viewportWidth * 2.5)) {
        m *= 2;
        setMultiplier(m);
      }
    };

    // Run check after the current render flushes.
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  // Build the repeated item list.
  const repeatedItems = Array.from({ length: multiplier }, () => items).flat();

  // Duration = total track pixel width / speed (px/s). Because we don't know
  // the exact width at definition time, we approximate: assume average item
  // width of 180 px (works for both text badges and icon tiles).
  const estimatedTrackWidth = items.length * multiplier * 180;
  const duration = estimatedTrackWidth / speed;

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
          <MarqueeItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Individual Item Renderer ─────────────────────────────────────────────────
function MarqueeItem({ item }: { item: MarqueeItem }) {
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
 * Items are duplicated `getBaseMultiplier(count)` × times in the DOM.
 * For rows with ≤ 3 items (e.g. Tools), the multiplier starts at 8 and
 * doubles automatically post-mount if the rendered track is still narrower
 * than 2.5 × the viewport width. This guarantees zero gap at animation start,
 * matching the behaviour of the longer rows without any layout tricks.
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
           * track. Because we always duplicate to at least 4× the original
           * set, the midpoint is far beyond the viewport edge – guaranteeing
           * the first visible item is at position 0 (screen left edge) on
           * every row, including the short 3-item Tools row.
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
