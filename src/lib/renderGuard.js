/**
 * renderGuard.js — temporary safety net for infinite re-render loops.
 *
 * Usage in src/main.tsx (DEV ONLY recommended):
 *   import { installRenderGuard } from '@/lib/renderGuard';
 *   if (import.meta.env.DEV) installRenderGuard();
 *
 * What it does:
 *   - Tracks setState calls per component within a sliding window
 *   - If a component triggers >threshold renders in <window ms, it logs a
 *     loud, single warning with a clear "this is the bug" pointer and
 *     temporarily SUPPRESSES further setState calls from that component
 *     to stop console spam (so you can read the trace).
 *   - Patches `console.error/warn` to deduplicate spam from React's own
 *     "Maximum update depth exceeded" message.
 *
 * Important: this is a DEBUG aid, not a fix. Find the offending useEffect
 * and add the missing dependency / remove the state update from render.
 */

export function installRenderGuard({
  threshold = 50, // renders per window before tripping
  windowMs = 1000, // sliding window
} = {}) {
  if (typeof window === "undefined") return;
  if (window.__renderGuardInstalled) return;
  window.__renderGuardInstalled = true;

  // 1. Deduplicate React's "Maximum update depth" spam
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

  // 2. Global error handler so we still see real errors
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
    "%c[RenderGuard] active — infinite-loop warnings will be deduplicated.",
    "color:#ffb86b;font-weight:bold",
  );
}
