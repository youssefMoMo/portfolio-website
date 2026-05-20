import { useTheme } from "@/hooks/use-theme";

/**
 * BackgroundOverlay — global fixed background applied behind every page.
 *
 * Layers (bottom → top):
 *   1. Solid theme-coloured base (fallback if bg.png fails)
 *   2. bg.png — fixed-attached, cover-sized, slight scale to hide blur edges
 *   3. Cinematic gradient tint — dark at edges/bottom, lighter in centre
 *   4. Subtle backdrop content layer (soft vignette)
 *
 * The image stays VISIBLE but UNDISTRACTING — content reads cleanly above it.
 */
export function BackgroundOverlay() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: isDark ? "#0b0b0f" : "#f5f5f7" }}
    >
      {/* ── Image layer ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/images/global/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          filter: isDark ? "blur(0.5px) brightness(0.8)" : "blur(1px) brightness(0.92)",
          transform: "scale(1.03)",
          transformOrigin: "center",
        }}
      />

      {/* ── Cinematic dark gradient overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? [
                "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(11,11,15,0.55) 60%, rgba(11,11,15,0.70) 100%)",
                "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.35) 100%)",
              ].join(", ")
            : [
                "linear-gradient(180deg, rgba(245,245,247,0.60) 0%, rgba(245,245,247,0.75) 100%)",
                "radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(245,245,247,0.40) 100%)",
              ].join(", "),
        }}
      />

      {/* ── Soft left/right vignette for depth ── */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(to right, rgba(0,0,0,0.20) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.20) 100%)"
            : "linear-gradient(to right, rgba(245,245,247,0.15) 0%, transparent 15%, transparent 85%, rgba(245,245,247,0.15) 100%)",
        }}
      />
    </div>
  );
}

export default BackgroundOverlay;
