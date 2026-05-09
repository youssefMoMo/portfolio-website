import { useTheme } from "@/hooks/use-theme";

/**
 * BackgroundOverlay — global fixed background applied behind every page.
 *
 * Layers (bottom → top):
 *   1. Solid theme-coloured background (fallback if image fails to load)
 *   2. Background image at /images/global/bg.png, fixed-attached, cover-sized
 *   3. Dark / light tint overlay tuned to the active theme
 *   4. Optional subtle blur (1px) to soften the photo so content reads cleanly
 *
 * Usage: render once at the top of <Layout /> with z-0; all other content
 * sits above it via z-10. No props — fully self-contained.
 *
 * Notes:
 *   - position: fixed + inset-0 keeps it pinned to the viewport regardless of
 *     scroll OR transformed ancestors (PageWrapper).
 *   - pointerEvents: none ensures clicks pass through to content.
 *   - The image gracefully falls back: if /images/global/bg.png is missing,
 *     the layered background colour shows through.
 */
export function BackgroundOverlay() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        // Solid base — matches the theme background so missing-image case still looks polished
        background: isDark ? "#0b0b0f" : "#f5f5f7",
      }}
    >
      {/* Image layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/images/global/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          // Slight blur for premium look — the content above remains crisp
          filter: isDark ? "blur(0.5px)" : "blur(1px) brightness(0.95)",
          transform: "scale(1.03)", // hides blur edge feathering
          transformOrigin: "center",
        }}
      />

      {/* Tint overlay — lighter than before so the bg image is actually visible.
          User reports image was "not appearing" because old 55-65% black tint
          on a dark bg.png left almost nothing showing through. */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(11,11,15,0.45) 100%)"
            : "linear-gradient(180deg, rgba(245,245,247,0.55) 0%, rgba(245,245,247,0.70) 100%)",
        }}
      />
    </div>
  );
}

export default BackgroundOverlay;
