/**
 * renderGuard.js — temporary safety net for infinite re-render loops.
 *
 * ⚠️  PRODUCTION GATE: the entire evaluation block is wrapped inside an
 *     `import.meta.env.DEV` check. In production builds Vite tree-shakes
 *     the dead branch out completely, leaving zero runtime footprint and
 *     zero console side-effects.
 *
 * Usage in src/main.tsx:
 *   import { installRenderGuard } from '@/lib/renderGuard';
 *   installRenderGuard(); // safe to call unconditionally — DEV gate is internal
 *
 * What it does (DEV only):
 *   - Patches `console.error/warn` to deduplicate React's "Maximum update
 *     depth exceeded" / "Cannot update a component" / "Too many re-renders"
 *     spam so you can read the first useful stack trace.
 *   - Attaches a global `error` listener that catches the same messages
 *     surfaced via window.onerror and suppresses duplicates.
 *
 * Important: this is a DEBUG aid, not a fix. Find the offending useEffect
 * and add the missing dependency / remove the state update from render.
 */

export function installRenderGuard({
  threshold = 50, // renders per window before tripping (unused in js version)
  windowMs = 1000, // sliding window ms (unused in js version)
} = {}) {
  // ── Production boundary ───────────────────────────────────────────────────
  // Wrap ALL logic inside this DEV gate. Vite replaces `import.meta.env.DEV`
  // with `false` in production builds, making the entire block dead code that
  // the minifier drops — zero production footprint.
  if (!import.meta.env.DEV) return;

  if (typeof window === "undefined") return;
  if (window.__renderGuardInstalled) return;
  window.__renderGuardInstalled = true;

  // 1. Deduplicate React's "Maximum update depth" / related spam
  const origError = console.error;
  const seen = new Map();

  console.error = function (...args) {
    const key = String(args[0] || "").slice(0, 200);
    if (
      key.includes("Maximum update depth exceeded") ||
      key.includes("Cannot update a component") ||
      key.includes("Too many re-renders")
    ) {
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      if (count === 1) {
        origError.apply(console, [
          "[RenderGuard] Detected likely infinite loop. First trace:",
          ...args,
        ]);
      } else if (count === 10 || count === 100) {
        origError.apply(console, [
          `[RenderGuard] Same loop fired ${count}x — fix the cause to clear console.`,
        ]);
      }
      return;
    }
    origError.apply(console, args);
  };

  // 2. Global error handler — catches the same messages via window.onerror
  window.addEventListener("error", (e) => {
    if (e?.message && e.message.includes("Maximum update depth")) {
      origError.call(
        console,
        "[RenderGuard] Maximum update depth — stopping further logs of this error.",
      );
      e.preventDefault?.();
    }
  });

  origError.call(
    console,
    "%c[RenderGuard] active (DEV) — infinite-loop warnings will be deduplicated.",
    "color:#ffb86b;font-weight:bold",
  );
}
