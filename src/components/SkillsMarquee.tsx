// src/components/SkillsMarquee.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  FRAMER MOTION LOOP REMOVED
//    • The previous `motion.div animate={{ x: "-25%" }}` ran inside React's JS
//      animation loop and was invisible to the external `.is-scrolling` CSS
//      pause rule used by DualMarqueeSection.
//    • This version uses an embedded `@keyframes skills-marquee-left` driven by
//      the browser compositor. The class `marquee-track` allows the global
//      `.is-scrolling .marquee-track { animation-play-state: paused }` CSS rule
//      (if present in globals.css) to pause this marquee in sync with all other
//      CSS-based marquees site-wide.
//    • `animationPlayState` is also toggled directly via React state to enable
//      the IntersectionObserver-based viewport freeze below.
//
//  4× → 2× DUPLICATION
//    • The previous code duplicated toolsData four times and animated to −25%,
//      injecting 32 DOM nodes for 8 items (24 redundant).
//    • Standard pattern: 2× duplication + `translate3d(0→−50%)` keyframe.
//      The track contains exactly one full copy at the midpoint, so the loop
//      is seamless with the minimum possible node count.
//
//  INTERSECTIONOBSERVER — viewport freeze
//    • Animation is paused when the section leaves the viewport.
//      Zero compositor overhead when the marquee is off-screen.
//
//  ECO MODE
//    • When `ecoMode` is active, the marquee is replaced with a simple
//      CSS flex-wrap row of static pill badges. No animation, no GPU layers.
//    • The eco state is read from `localStorage` (key: `yd_eco_mode`) and
//      stays in sync with the `yd-perf-settings-changed` event fired by
//      `usePerformanceSettings` in SettingsModal.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ECO_MODE_KEY, PERF_SETTINGS_EVENT } from "@/components/SettingsModal";

// ─── Static tool definitions ─────────────────────────────────────────────────

interface ToolDef {
  id: number;
  name: string;
  emoji: string;
  logo: string;
}

const TOOLS: ToolDef[] = [
  { id: 1, name: "Figma",         emoji: "🎨", logo: "/images/global/figma.png"         },
  { id: 2, name: "Photoshop",     emoji: "🖼️", logo: "/images/global/photoshop.png"     },
  { id: 3, name: "Illustrator",   emoji: "🎭", logo: "/images/global/illustrator.png"   },
  { id: 4, name: "Premiere Pro",  emoji: "🎬", logo: "/images/global/premiere.png"      },
  { id: 5, name: "After Effects", emoji: "✨", logo: "/images/global/aftereffects.png"  },
  { id: 6, name: "Roblox Studio", emoji: "🎮", logo: "/images/global/roblox-studio.png" },
  { id: 7, name: "Blender",       emoji: "🔷", logo: "/images/global/blender.png"       },
  { id: 8, name: "Unity",         emoji: "🎯", logo: "/images/global/unity.png"         },
];

// ─── Embedded keyframes ───────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes skills-marquee-left {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
`;

// ─── Edge fade mask (alpha-channel — theme-agnostic) ─────────────────────────

const EDGE_MASK =
  "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";

// ─── Tool pill card ───────────────────────────────────────────────────────────

function ToolPill({ tool }: { tool: ToolDef }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="flex-shrink-0 bg-white/80 dark:bg-card/60 border border-slate-200 dark:border-white/10 rounded-full px-5 py-2.5 flex items-center gap-2.5 hover:border-primary/30 hover:bg-white/95 dark:hover:bg-card/80 transition-colors cursor-default shadow-sm dark:shadow-none"
    >
      {/* 24 × 24 fixed icon box — prevents CLS on image-load failure */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: 24, height: 24 }}
      >
        {!imgFailed ? (
          <img
            src={tool.logo}
            alt=""
            aria-hidden="true"
            className="absolute w-full h-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-base select-none" aria-hidden="true">
            {tool.emoji}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-foreground whitespace-nowrap">
        {tool.name}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SkillsMarquee() {
  const sectionRef = useRef<HTMLElement>(null);

  const [ecoMode, setEcoMode] = useState(false);
  const [ready,   setReady]   = useState(false);
  const [inView,  setInView]  = useState(true);

  // ── SSR-safe mount ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true");
    } catch { /* private browsing / SSR */ }
    // One rAF before starting — avoids white-flash artefact on first paint.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Eco-mode sync via settings event ─────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      try { setEcoMode(localStorage.getItem(ECO_MODE_KEY) === "true"); } catch {}
    };
    window.addEventListener(PERF_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(PERF_SETTINGS_EVENT, sync);
  }, []);

  // ── IntersectionObserver: pause animations when off-screen ───────────────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── 2× duplication — minimum DOM for seamless −50% keyframe ──────────────
  const duplicated: ToolDef[] = [...TOOLS, ...TOOLS];

  const running = ready && inView && !ecoMode;

  const trackStyle: CSSProperties = {
    animation: `skills-marquee-left 22s linear infinite`,
    animationPlayState: running ? "running" : "paused",
    willChange: "transform",
    transform: "translate3d(0, 0, 0)",
  };

  // ─── ECO MODE — static pill grid ──────────────────────────────────────────

  if (ecoMode) {
    return (
      <section className="w-full py-10 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <h3 className="text-2xl md:text-3xl font-display font-bold text-center">
            Tools &amp; Technologies I Work With
          </h3>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-3">
          {TOOLS.map((tool) => (
            <ToolPill key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    );
  }

  // ─── ANIMATED MARQUEE ─────────────────────────────────────────────────────

  return (
    <section
      ref={sectionRef}
      className="w-full py-12 overflow-hidden border-y border-white/5"
    >
      {/* Self-contained keyframes — no globals.css dependency */}
      <style>{KEYFRAMES}</style>

      <div className="max-w-7xl mx-auto px-6 mb-8">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-center">
          Tools &amp; Technologies I Work With
        </h3>
      </div>

      {/* Marquee container with alpha-channel edge fade */}
      <div
        className="relative w-full overflow-hidden"
        style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
      >
        {/* Marquee track
            The `marquee-track` class lets a global `.is-scrolling .marquee-track`
            CSS rule pause this marquee in sync with DualMarqueeSection rows. */}
        <div
          className="flex gap-5 sm:gap-6 w-max marquee-track"
          style={trackStyle}
        >
          {duplicated.map((tool, index) => (
            <ToolPill key={`${tool.id}-${index}`} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
