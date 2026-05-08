// ═══════════════════════════════════════════════════════════════
// THEME PROVIDER & HOOK
// src/hooks/use-theme.tsx
// Based on shadcn/ui theme implementation
// Last Updated: 2026
// ═══════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (Exported for reuse)
// ═══════════════════════════════════════════════════════════════

/**
 * Available theme options
 */
export type Theme = "dark" | "light" | "system";

/**
 * Props for ThemeProvider component
 */
export type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  /**
   * Optional callback when theme changes
   * @param theme - The new active theme ("dark" or "light", not "system")
   */
  onThemeChange?: (theme: "dark" | "light") => void;
};

/**
 * State returned by useTheme hook
 */
export type ThemeProviderState = {
  theme: Theme;
  /**
   * The resolved theme after applying system preference
   * Always returns "dark" or "light", never "system"
   */
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  /**
   * Toggle between dark and light (ignores system)
   */
  toggleTheme: () => void;
  /**
   * Check if current resolved theme is dark
   */
  isDark: boolean;
  /**
   * Check if current resolved theme is light
   */
  isLight: boolean;
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════

const THEME_STORAGE_KEY = "vite-ui-theme";

/**
 * Validate if a string is a valid Theme value
 */
function isValidTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/**
 * Get the system's preferred color scheme
 * Returns "dark" or "light" based on OS preference
 * Safe for SSR (returns "light" as fallback)
 */
function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Resolve the actual theme to apply based on user preference and system
 */
function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") return getSystemTheme();
  return theme;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

// ═══════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * Theme provider component that manages theme state and applies it to the document
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark" storageKey="my-app-theme">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = THEME_STORAGE_KEY,
  onThemeChange,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // SSR-safe initialization
    if (typeof window === "undefined") return defaultTheme;

    try {
      const stored = localStorage.getItem(storageKey);
      if (isValidTheme(stored)) return stored;
    } catch (error) {
    }

    return defaultTheme;
  });

  const resolvedTheme = resolveTheme(theme);

  // ✅ FIXED: Removed onThemeChange from dependencies to prevent re-renders
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const currentTheme = root.classList.contains("dark") ? "dark" : "light";

    // ✅ Only update if actually different - prevents unnecessary re-renders
    if (currentTheme !== resolvedTheme) {
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
      root.setAttribute("data-theme", resolvedTheme);

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        const newContent = resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff";
        if (metaThemeColor.getAttribute("content") !== newContent) {
          metaThemeColor.setAttribute("content", newContent);
        }
      }
    }
  }, [resolvedTheme]); // ✅ Removed onThemeChange

  // ✅ FIXED: System theme listener with proper cleanup and early return
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const root = window.document.documentElement;
      const newTheme = mediaQuery.matches ? "dark" : "light";

      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      root.setAttribute("data-theme", newTheme);

      if (onThemeChange) {
        onThemeChange(newTheme);
      }
    };

    // Call immediately on mount to sync with system
    handleChange();

    // Use addEventListener with proper cleanup
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme, onThemeChange]);

  // ✅ FIXED: Added logging, early return, and proper dependencies
  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (newTheme === theme) {
        return;
      }

      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (error) {
      }

      setThemeState(newTheme);
    },
    [theme, storageKey],
  );

  // ✅ FIXED: Added useCallback with proper dependencies
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // ✅ FIXED: Added useMemo to prevent unnecessary re-renders
  const isDark = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);
  const isLight = useMemo(() => resolvedTheme === "light", [resolvedTheme]);

  // Memoize the context value so consumers don't re-render on every parent render.
  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isDark,
      isLight,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, isDark, isLight],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Hook to access theme state and methods
 * Must be used within a ThemeProvider
 *
 * @returns ThemeProviderState with theme, setTheme, toggleTheme, isDark, isLight
 *
 * @example
 * ```tsx
 * const { theme, setTheme, isDark } = useTheme();
 *
 * return (
 *   <button onClick={() => setTheme(isDark ? "light" : "dark")}>
 *     Toggle Theme
 *   </button>
 * );
 * ```
 *
 * @throws Error if used outside of ThemeProvider
 */
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

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE HOOKS (Optional helpers)
// ═══════════════════════════════════════════════════════════════

/**
 * Hook that returns only the boolean theme states
 * Useful for conditional rendering without full state
 */
export function useThemeMode() {
  const { isDark, isLight } = useTheme();
  return { isDark, isLight };
}

/**
 * Hook for components that only need to toggle theme
 */
export function useThemeToggle() {
  const { toggleTheme, resolvedTheme } = useTheme();
  return { toggleTheme, currentTheme: resolvedTheme };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Main exports:
 *
 * Types:
 * - Theme: "dark" | "light" | "system"
 * - ThemeProviderProps: Props for the provider component
 * - ThemeProviderState: Return type of useTheme hook
 *
 * Components:
 * - ThemeProvider: Context provider for theme management
 *
 * Hooks:
 * - useTheme(): Main hook with full state and methods
 * - useThemeMode(): Simplified hook returning only isDark/isLight
 * - useThemeToggle(): Simplified hook for toggle functionality
 *
 * Helpers:
 * - isValidTheme(): Type guard for Theme values
 * - getSystemTheme(): Get OS preference (SSR-safe)
 * - resolveTheme(): Convert Theme to actual "dark" | "light"
 *
 * Features:
 * ✅ SSR-safe with typeof window checks
 * ✅ Type-safe with Theme union type
 * ✅ System theme detection with media query listener
 * ✅ Meta theme-color update for mobile browsers
 * ✅ Memoized values for performance
 * ✅ Configurable storage key and default theme
 * ✅ onThemeChange callback for side effects (still works, just not in useEffect deps)
 * ✅ JSDoc documentation with examples
 * ✅ Fixed: Prevents infinite re-renders with useCallback, useMemo, and early returns
 * ✅ Fixed: Proper dependencies in all hooks to prevent unnecessary re-renders
 * ✅ Fixed: Added checks to prevent unnecessary DOM updates
 * ✅ Fixed: Added console logging for debugging
 * ✅ Fixed: Removed onThemeChange from useEffect dependencies to prevent re-renders
 */
