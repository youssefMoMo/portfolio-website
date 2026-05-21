"use client";

import React, { useRef, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MarqueeItem {
  label: string;
  icon?: React.ReactNode;
  /** Optional image src (used for tool logos, etc.) */
  image?: string;
}

export interface MarqueeRowConfig {
  items: MarqueeItem[];
  /** px per second – each row can have its own speed */
  speed?: number;
  /** Reverse scroll direction */
  reverse?: boolean;
}

interface DualMarqueeSectionProps {
  /**
   * FIX: `rows` is now optional.
   *
   * Home.tsx calls `<DualMarqueeSection />` with no props. Previously the
   * component required `rows` — passing `undefined` caused a crash when the
   * internal `.map()` call hit `undefined.map is not a function`.
   *
   * When rows is omitted, the built-in DEFAULT_ROWS are used, which cover
   * the three standard rows shown on the portfolio home page.
   */
  rows?: MarqueeRowConfig[];
  className?: string;
}

// ─── Default Rows (used when no rows prop is passed) ─────────────────────────
/**
 * Row 1 – Design skills / services (fast, left-to-right)
 * Row 2 – More capabilities (medium speed, right-to-left)
 * Row 3 – Tools (slow, left-to-right) — only 3 items; handled with high multiplier
 */
const DEFAULT_ROWS: MarqueeRowConfig[] = [
  {
    speed: 55,
    items: [
      { label: "UI Design" },
      { label: "UX Research" },
      { label: "Game Interfaces" },
      { label: "HUD Design" },
      { label: "Menu Systems" },
      { label: "Inventory UI" },
      { label: "Shop UI" },
      { label: "Loading Screens" },
      { label: "Leaderboards" },
      { label: "Responsive Layouts" },
    ],
  },
  {
    speed: 40,
    reverse: true,
    items: [
      { label: "Roblox Studio" },
      { label: "Figma Source Files" },
      { label: "Component Systems" },
      { label: "Dark & Light Themes" },
      { label: "Flat UI Aesthetic" },
      { label: "Rapid Prototyping" },
      { label: "Client Revisions" },
      { label: "Professional Grade" },
      { label: "Fast Delivery" },
    ],
  },
  {
    speed: 28,
    items: [
      {
        label: "Photoshop",
        image: "/images/global/photoshop.png",
      },
      {
        label: "Figma",
        image: "/images/global/figma.png",
      },
      {
        label: "Roblox Studio",
        image: "/images/global/roblox-studio.png",
      },
    ],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_TRACK_WIDTH_PX = 10_000;

/**
 * Base repeat multiplier per row length.
 * Short rows (≤ 3 items) start at 12× so their DOM track is guaranteed to
 * fill any viewport width before the RAF post-mount check even runs.
 */
function getBaseMultiplier(itemCount: number): number {
  if (itemCount <= 3)  return 12;
  if (itemCount <= 5)  return 8;
  if (itemCount <= 8)  return 4;
  return 2;
}

// ─── Single Marquee Track ─────────────────────────────────────────────────────
function MarqueeTrack({
  items,
  speed = 60,
  reverse = false,
}: MarqueeRowConfig) {
  const trackRef   = useRef<HTMLDivElement>(null);
  const [mult, setMult] = useState<number>(getBaseMultiplier(items.length));

  /**
   * Post-mount width check: if the rendered track is still narrower than
   * MIN_TRACK_WIDTH_PX (or 2.5× viewport), double the multiplier.
   * The dependency on `mult` ensures the check re-runs after each doubling
   * until the track is wide enough.
   */
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (!trackRef.current) return;
      const tw = trackRef.current.scrollWidth;
      const vw = window.innerWidth;
      if (tw < Math.max(MIN_TRACK_WIDTH_PX, vw * 2.5)) {
        setMult((m) => m * 2);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [items.length, mult]);

  const repeatedItems = Array.from({ length: mult }, () => items).flat();

  // Duration derived from measured track width when available, else estimated.
  const measured  = trackRef.current?.scrollWidth ?? 0;
  const estimated = items.length * mult * 180;
  const halfWidth = (measured > 0 ? measured : estimated) / 2;
  const duration  = halfWidth / speed;

  const animStyle: React.CSSProperties = {
    "--marquee-duration": `${duration}s`,
    animationDirection: reverse ? "reverse" : "normal",
  } as React.CSSProperties;

  return (
    <div className="marquee-viewport overflow-hidden w-full">
      <div
        ref={trackRef}
        className="marquee-track flex gap-4 w-max"
        style={animStyle}
      >
        {repeatedItems.map((item, idx) => (
          <MarqueeItemCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────
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

// ─── Public Component ──────────────────────────────────────────────────────────
/**
 * DualMarqueeSection
 *
 * FIXES in this version:
 *  1. `rows` is now optional — defaults to DEFAULT_ROWS so `<DualMarqueeSection />`
 *     (no props) works correctly (Home.tsx calls it this way).
 *  2. Component is exported BOTH as default AND as a named export so both
 *     `import DualMarqueeSection from "..."` and
 *     `import { DualMarqueeSection } from "..."` (used by Home.tsx) resolve.
 *  3. Row-3 multiplier raised to 12 and the post-mount checker loops via its
 *     own dependency so speed never drifts after a doubling.
 */
export function DualMarqueeSection({
  rows = DEFAULT_ROWS,
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

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll var(--marquee-duration, 30s) linear infinite;
          will-change: transform;
        }
        .marquee-viewport {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
          mask-image:         linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
        }
        .marquee-viewport:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}

// Also export as default so both import styles work.
export default DualMarqueeSection;
