// ═══════════════════════════════════════════════════════════════
// MOBILE DETECTION HOOKS
// src/hooks/use-mobile.tsx
// Last Updated: 2026
// ═══════════════════════════════════════════════════════════════

import * as React from "react";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Breakpoint for mobile detection in pixels
 * Screens with width < this value are considered mobile
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Default value to return during SSR/hydration
 * Set to false to avoid hydration mismatches (mobile-first approach)
 */
export const DEFAULT_MOBILE_STATE = false;

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Return type for useMediaQuery hook
 */
export type UseMediaQueryReturn = {
  matches: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isTablet: boolean;
};

// ═══════════════════════════════════════════════════════════════
// GENERIC HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Generic hook to track media query matches
 * SSR-safe with configurable default value
 *
 * @param query - Media query string (e.g., "(max-width: 768px)")
 * @param defaultValue - Value to return during SSR/hydration (default: false)
 * @returns boolean indicating if the query matches
 *
 * @example
 * const isPrint = useMediaQuery("print");
 * const isPortrait = useMediaQuery("(orientation: portrait)");
 */
export function useMediaQuery(
  query: string,
  defaultValue: boolean = DEFAULT_MOBILE_STATE,
): boolean {
  const [matches, setMatches] = React.useState<boolean>(defaultValue);

  React.useEffect(() => {
    // SSR check - only run in browser
    if (typeof window === "undefined") return;

    // Check if matchMedia is supported
    if (typeof window.matchMedia !== "function") {
      return;
    }

    try {
      const mediaQueryList = window.matchMedia(query);

      // Set initial value
      setMatches(mediaQueryList.matches);

      // Define change handler
      const handleChange = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // Add listener (modern API)
      mediaQueryList.addEventListener("change", handleChange);

      // Cleanup
      return () => {
        mediaQueryList.removeEventListener("change", handleChange);
      };
    } catch (error) {
      return;
    }
  }, [query]);

  return matches;
}

// ═══════════════════════════════════════════════════════════════
// SPECIFIC HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Hook to detect if viewport is mobile size
 * SSR-safe with configurable default
 *
 * @param breakpoint - Custom breakpoint in pixels (optional, defaults to MOBILE_BREAKPOINT)
 * @param defaultValue - Value during SSR (optional, defaults to DEFAULT_MOBILE_STATE)
 * @returns boolean indicating if viewport is mobile
 *
 * @example
 * const isMobile = useIsMobile();
 * const isSmallMobile = useIsMobile(480); // Custom breakpoint
 *
 * @example
 * // In component
 * if (useIsMobile()) {
 *   return <MobileNavigation />;
 * }
 * return <DesktopNavigation />;
 */
export function useIsMobile(
  breakpoint: number = MOBILE_BREAKPOINT,
  defaultValue: boolean = DEFAULT_MOBILE_STATE,
): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`, defaultValue);
}

/**
 * Hook to detect if viewport is desktop size
 * SSR-safe with configurable default
 *
 * @param breakpoint - Custom breakpoint in pixels (optional)
 * @param defaultValue - Value during SSR (optional)
 * @returns boolean indicating if viewport is desktop
 *
 * @example
 * const isDesktop = useIsDesktop();
 */
export function useIsDesktop(
  breakpoint: number = MOBILE_BREAKPOINT,
  defaultValue: boolean = !DEFAULT_MOBILE_STATE,
): boolean {
  return useMediaQuery(`(min-width: ${breakpoint}px)`, defaultValue);
}

/**
 * Hook to detect if viewport is tablet size (between mobile and desktop)
 * SSR-safe with configurable default
 *
 * @param mobileBreakpoint - Upper limit for mobile (default: 768)
 * @param desktopBreakpoint - Lower limit for desktop (default: 1024)
 * @param defaultValue - Value during SSR (optional)
 * @returns boolean indicating if viewport is tablet size
 *
 * @example
 * const isTablet = useIsTablet();
 * const isLargeTablet = useIsTablet(768, 1280);
 */
export function useIsTablet(
  mobileBreakpoint: number = MOBILE_BREAKPOINT,
  desktopBreakpoint: number = 1024,
  defaultValue: boolean = DEFAULT_MOBILE_STATE,
): boolean {
  const query = `(min-width: ${mobileBreakpoint}px) and (max-width: ${desktopBreakpoint - 1}px)`;
  return useMediaQuery(query, defaultValue);
}

/**
 * Comprehensive hook returning all viewport states
 * SSR-safe with configurable default
 *
 * @param options - Optional configuration
 * @param options.mobileBreakpoint - Mobile breakpoint (default: 768)
 * @param options.desktopBreakpoint - Desktop breakpoint (default: 1024)
 * @param options.defaultValue - SSR default value (default: false)
 * @returns Object with matches, isMobile, isDesktop, isTablet
 *
 * @example
 * const { isMobile, isDesktop, isTablet } = useViewport();
 *
 * @example
 * const { matches } = useViewport({ mobileBreakpoint: 640 });
 */
export function useViewport({
  mobileBreakpoint = MOBILE_BREAKPOINT,
  desktopBreakpoint = 1024,
  defaultValue = DEFAULT_MOBILE_STATE,
}: {
  mobileBreakpoint?: number;
  desktopBreakpoint?: number;
  defaultValue?: boolean;
} = {}): UseMediaQueryReturn {
  const isMobile = useIsMobile(mobileBreakpoint, defaultValue);
  const isDesktop = useIsDesktop(desktopBreakpoint, !defaultValue);
  const isTablet = useIsTablet(
    mobileBreakpoint,
    desktopBreakpoint,
    defaultValue,
  );

  // matches indicates if any non-desktop query matches (mobile or tablet)
  const matches = isMobile || isTablet;

  return { matches, isMobile, isDesktop, isTablet };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Main exports:
 *
 * Constants:
 * - MOBILE_BREAKPOINT: Default breakpoint for mobile detection (768px)
 * - DEFAULT_MOBILE_STATE: Default value during SSR (false)
 *
 * Types:
 * - UseMediaQueryReturn: Return type for useViewport hook
 *
 * Hooks:
 * - useMediaQuery(query, defaultValue): Generic media query hook
 * - useIsMobile(breakpoint, defaultValue): Detect mobile viewport
 * - useIsDesktop(breakpoint, defaultValue): Detect desktop viewport
 * - useIsTablet(mobileBP, desktopBP, defaultValue): Detect tablet viewport
 * - useViewport(options): Comprehensive viewport state hook
 *
 * Features:
 * ✅ SSR-safe with typeof window checks
 * ✅ Configurable default values to prevent hydration mismatches
 * ✅ Error handling for unsupported environments
 * ✅ Modern MediaQueryListEvent API with proper cleanup
 * ✅ Type-safe with TypeScript
 * ✅ JSDoc documentation with examples
 */
