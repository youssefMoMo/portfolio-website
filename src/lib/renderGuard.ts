/**
 * renderGuard.ts — temporary safety net for infinite re-render loops.
 *
 * Usage in src/main.tsx:
 *   import { installRenderGuard } from '@/lib/renderGuard';
 *   installRenderGuard(); // internally guards itself to DEV-only
 *
 * What it does:
 *   - ONLY initialises when `import.meta.env.DEV === true`. In production
 *     builds the function returns immediately without touching any global,
 *     so there is zero runtime overhead and zero console pollution in prod.
 *   - Patches `console.error` to deduplicate React's "Maximum update depth
 *     exceeded" / "Cannot update a component" / "Too many re-renders" spam,
 *     so you can actually read the first useful stack trace.
 *   - Attaches a global `error` handler to catch the same messages surfaced
 *     via window.onerror.
 *   - Exports `disableRenderGuard()` which cleanly restores the native
 *     `console.error` reference, preventing any lingering global method
 *     pollution after you've identified and fixed the offending component.
 *
 * Important: this is a DEBUG aid, not a fix. Find the offending useEffect
 * and add the missing dependency / remove the state update from the render path.
 */

// ─── Global augmentation ─────────────────────────────────────────────────────
// Declare the sentinel on `window` so TypeScript doesn't complain about
// reading/writing a non-standard property.
declare global {
  interface Window {
    __renderGuardInstalled?: boolean;
  }
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface RenderGuardOptions {
  /** Maximum number of matching error messages before they are muted. Default: 50 */
  threshold?: number;
  /** Sliding window in milliseconds for rate-limiting. Default: 1000 */
  windowMs?: number;
}

// ─── Module-level handle to the patched console ───────────────────────────────
// Stored here (not just inside installRenderGuard's closure) so that
// disableRenderGuard() can reach it from outside the closure.
let _patchedConsoleError: ((...args: unknown[]) => void) | null = null;
let _originalConsoleError: ((...args: unknown[]) => void) | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Activate the render-loop guard.
 *
 * ⚠️ PRODUCTION GATE: if `import.meta.env.DEV` is not `true` this function
 * returns immediately and does nothing. No globals are mutated. No listeners
 * are registered. This is the primary mechanism that prevents any side-effect
 * from leaking into production builds.
 */
export function installRenderGuard(options: RenderGuardOptions = {}): void {
  // ── Production boundary ────────────────────────────────────────────────────
  // Must be the very first check — evaluated before any other side-effects.
  if (!import.meta.env.DEV) return;

  if (typeof window === "undefined") return;
  if (window.__renderGuardInstalled) return;

  window.__renderGuardInstalled = true;

  const { threshold = 50, windowMs = 1000 } = options;
  // `threshold` and `windowMs` are retained for future rate-limiting extensions.
  void threshold;
  void windowMs;

  // ── 1. Capture the native console.error reference BEFORE patching ─────────
  // Stored in module scope so disableRenderGuard() can restore it cleanly.
  _originalConsoleError = console.error.bind(console) as (...args: unknown[]) => void;

  // ── 2. Deduplicate React's "Maximum update depth" spam ────────────────────
  const seen = new Map<string, number>();

  const patchedError = function (...args: unknown[]): void {
    const key: string = String(args[0] ?? "").slice(0, 200);

    if (
      key.includes("Maximum update depth exceeded") ||
      key.includes("Cannot update a component") ||
      key.includes("Too many re-renders")
    ) {
      const count: number = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);

      if (count === 1) {
        _originalConsoleError!(
          "[RenderGuard] Detected likely infinite re-render loop. First trace:",
          ...args,
        );
      } else if (count === 10 || count === 100) {
        _originalConsoleError!(
          `[RenderGuard] Same loop has fired ${count}× — fix the root cause to clear console.`,
        );
      }
      // All subsequent duplicates are silently swallowed to prevent log flooding.
      return;
    }

    // Pass every non-loop error through to the original handler untouched.
    _originalConsoleError!(...args);
  };

  console.error = patchedError;
  _patchedConsoleError = patchedError;

  // ── 3. Global window.onerror handler — catch the same message via DOM ─────
  window.addEventListener("error", (e: ErrorEvent): void => {
    if (e?.message?.includes("Maximum update depth")) {
      _originalConsoleError!(
        "[RenderGuard] Maximum update depth caught via window.onerror — stopping further logs.",
      );
      e.preventDefault?.();
    }
  });

  // ── 4. Confirm activation ─────────────────────────────────────────────────
  _originalConsoleError(
    "%c[RenderGuard] active — infinite-loop console errors will be deduplicated.",
    "color:#ffb86b;font-weight:bold",
  );
}

/**
 * Restore `console.error` to the browser's native implementation.
 *
 * Call this after you've identified and fixed the offending component to
 * prevent any lingering global method pollution for the remainder of the
 * session. Safe to call even if `installRenderGuard` was never called or
 * returned early (e.g. in production).
 */
export function disableRenderGuard(): void {
  // Only act if we actually patched console.error and have the original stored.
  if (_originalConsoleError === null || _patchedConsoleError === null) return;

  // Only restore if our patched version is still the active one.
  // If something else re-patched console.error after us, leave it alone.
  if ((console.error as unknown) === _patchedConsoleError) {
    console.error = _originalConsoleError as typeof console.error;
  }

  _patchedConsoleError = null;
  _originalConsoleError = null;

  if (typeof window !== "undefined") {
    window.__renderGuardInstalled = false;
  }
}
