// ═══════════════════════════════════════════════════════════════
// ROBLOX DATA HOOK — PRODUCTION REFACTOR  (was useRobloxData.js)
// src/hooks/useRobloxData.ts
//
// Changelog vs. original:
//   [FIX-11] Full TypeScript conversion: interfaces defined for
//            every API response shape and all hook parameters.
//            No implicit `any` remains.
//   [FIX-12] Reference isolation: the `fallback` prop is captured
//            into a stable useRef on first render so it is excluded
//            from the useCallback/useEffect dependency arrays.
//            This eliminates the infinite re-fetch loop caused by
//            callers passing an inline object literal as fallback.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Roblox API Type Definitions [FIX-11] ────────────────────────────────────

/** Shapes returned by the /api/roblox proxy for type === "universe" */
export interface RobloxUniverseData {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string;
  sourceName?: string;
  sourceDescription?: string;
  creator: {
    id: number;
    name: string;
    type: "User" | "Group";
    isRNVAccount: boolean;
    hasVerifiedBadge: boolean;
  };
  price?: number | null;
  allowedGearGenres: string[];
  allowedGearCategories: string[];
  isGenreEnforced: boolean;
  copyingAllowed: boolean;
  playing: number;
  visits: number;
  maxPlayers: number;
  created: string;
  updated: string;
  studioAccessToApisAllowed: boolean;
  createVipServersAllowed: boolean;
  universeAvatarType: string;
  genre: string;
  isAllGenre: boolean;
  isFavoritedByUser: boolean;
  favoritedCount: number;
}

/** Shapes returned by the /api/roblox proxy for type === "thumbnail" */
export interface RobloxThumbnailData {
  targetId: number;
  state: "Completed" | "Pending" | "Error";
  imageUrl: string;
  version?: string;
}

/** Shapes returned by the /api/roblox proxy for type === "icon" */
export interface RobloxIconData {
  targetId: number;
  state: "Completed" | "Pending" | "Error";
  imageUrl: string;
}

/** Union of all possible data payloads */
export type RobloxApiData =
  | RobloxUniverseData
  | RobloxThumbnailData
  | RobloxIconData
  | Record<string, unknown>;

/** Envelope returned by the /api/roblox serverless function */
export interface RobloxApiEnvelope<T = RobloxApiData> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Hook return type */
export interface UseRobloxDataReturn<T = RobloxApiData> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Hook parameters [FIX-11] */
export interface UseRobloxDataParams<T = RobloxApiData> {
  type: string;
  id: string | number;
  size?: string;
  /** [FIX-12] Captured into a ref — safe to pass as an inline object literal */
  fallback?: T | null;
  enabled?: boolean;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * useRobloxData — fetches the /api/roblox endpoint with proper lifecycle handling.
 *
 * @example
 * const { data, loading, error, refetch } = useRobloxData<RobloxUniverseData>({
 *   type: 'universe',
 *   id: '123456789',
 *   fallback: FALLBACK_UNIVERSE,
 * });
 */
export default function useRobloxData<T = RobloxApiData>({
  type,
  id,
  size,
  fallback = null,
  enabled = true,
}: UseRobloxDataParams<T>): UseRobloxDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // [FIX-12] Capture fallback in a ref so it never participates in the
  // dependency arrays of useCallback or useEffect, preventing an infinite
  // re-render cycle when the caller passes an inline object literal.
  const fallbackRef = useRef<T | null>(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  // [FIX-12] Dependencies: only primitive / stable values. fallback excluded.
  const fetchData = useCallback(async (): Promise<void> => {
    if (!enabled || !type || !id) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type, id: String(id) });
      if (size) params.set("size", size);

      const res = await fetch(`/api/roblox?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json: RobloxApiEnvelope<T> = await res.json();

      if (!json?.success) {
        throw new Error(json?.error ?? "Unknown API error");
      }

      setData(json.data ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;

      const typedError = err instanceof Error ? err : new Error(String(err));
      console.warn("[useRobloxData] failed:", typedError);
      setError(typedError);

      // [FIX-12] Read fallback from ref — no stale closure issues
      if (fallbackRef.current != null) {
        setData(fallbackRef.current);
      }
    } finally {
      // Only update loading state if this controller is still current
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [type, id, size, enabled]); // [FIX-12] fallback intentionally omitted

  useEffect(() => {
    void fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
