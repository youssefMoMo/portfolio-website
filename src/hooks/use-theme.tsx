// src/hooks/use-theme.tsx
//
// DARK-MODE LOCK — 2026
// ─────────────────────────────────────────────────────────────────────────────
// Light mode has been permanently removed from this project.
// The `dark` class is hardcoded onto <html> at mount and never mutated.
//
// API surface is intentionally preserved 1-for-1 so every consumer that
// calls `useTheme()`, `useThemeMode()`, or `useThemeToggle()` continues to
// compile and behave correctly without any changes at the call site.
//
// What changed vs the old multi-theme implementation:
//   • ThemeProvider: no longer reads localStorage, listens to matchMedia,
//     or writes to the DOM dynamically.  On mount it forcibly sets
//     `html.classList = ["dark"]` and `data-theme="dark"` — once, synchronously
//     in the useEffect — and then does nothing else for the rest of the session.
//   • setTheme / toggleTheme: still exist on the context so TypeScript and
//     SettingsModal (which now hides the theme UI but still imports the hook)
//     won't break.  Both are no-ops.
//   • resolvedTheme / isDark / isLight: permanently "dark" / true / false.
//   • Storage key "youssef-ui-theme" is written once with "dark" on mount
//     to overwrite any stale "light" or "system" value a returning visitor
//     might have in localStorage.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types (unchanged — full backward compat) ─────────────────────────────────

export type Theme = "dark" | "light" | "system";

export type ThemeProviderProps = {
  children:        ReactNode;
  defaultTheme?:   Theme;       // accepted but ignored — always "dark"
  storageKey?:     string;
  onThemeChange?:  (theme: "dark" | "light") => void;
};

export type ThemeProviderState = {
  theme:         Theme;
  resolvedTheme: "dark" | "light";
  setTheme:      (theme: Theme) => void;
  toggleTheme:   () => void;
  isDark:        boolean;
  isLight:       boolean;
};

// ─── Helpers (kept for any external callers) ──────────────────────────────────

export function isValidTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** Always returns "dark" — system preference is ignored in dark-lock mode. */
export function getSystemTheme(): "dark" | "light" {
  return "dark";
}

/** Always returns "dark". */
export function resolveTheme(_theme: Theme): "dark" | "light" {
  return "dark";
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({
  children,
  storageKey = "youssef-ui-theme",
  onThemeChange,
}: ThemeProviderProps) {

  // ── Hard-lock the DOM to dark on mount ──────────────────────────────────
  //
  // Runs once, synchronously after the first paint.
  // • Removes "light" and "system" classes (stale from old implementation).
  // • Adds "dark" and sets data-theme="dark" unconditionally.
  // • Overwrites localStorage so returning visitors with a stale "light"
  //   value don't get a flicker on their next visit.
  // • Updates meta[name="theme-color"] for mobile browser chrome.
  // • Fires onThemeChange("dark") once so any parent callback is notified.
  //
  // No matchMedia listener is registered — system preference is irrelevant.

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    // Forcibly wipe any existing theme classes and stamp "dark"
    root.classList.remove("light", "system");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");

    // Overwrite stale localStorage entry
    try { localStorage.setItem(storageKey, "dark"); } catch { /* quota exceeded */ }

    // Mobile browser chrome colour
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#0a0a0a");
    }

    // Notify optional parent callback exactly once
    if (onThemeChange) onThemeChange("dark");

    // No cleanup needed — we WANT the class to persist for the session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: run once on mount, never again

  // ── Stable no-op callbacks ────────────────────────────────────────────────
  //
  // setTheme and toggleTheme must exist on the context (SettingsModal and
  // other consumers import them).  They are intentional no-ops: calling them
  // has no effect, which is the correct behaviour when theme is locked.

  const setTheme    = useCallback((_t: Theme)  => { /* dark-lock: no-op */ }, []);
  const toggleTheme = useCallback(()           => { /* dark-lock: no-op */ }, []);

  // ── Permanent dark values ─────────────────────────────────────────────────

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme:         "dark",
      resolvedTheme: "dark",
      setTheme,
      toggleTheme,
      isDark:  true,
      isLight: false,
    }),
    [setTheme, toggleTheme],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. " +
        "Wrap your app with <ThemeProvider> at the root level.",
    );
  }

  return context;
}

// ─── Convenience hooks (API unchanged) ───────────────────────────────────────

/** Returns { isDark: true, isLight: false } permanently. */
export function useThemeMode() {
  const { isDark, isLight } = useTheme();
  return { isDark, isLight };
}

/** Returns { toggleTheme: no-op, currentTheme: "dark" } permanently. */
export function useThemeToggle() {
  const { toggleTheme, resolvedTheme } = useTheme();
  return { toggleTheme, currentTheme: resolvedTheme };
}
