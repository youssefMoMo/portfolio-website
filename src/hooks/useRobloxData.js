import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useRobloxData — fetches the /api/roblox endpoint with proper lifecycle handling.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useRobloxData({
 *     type: 'universe',
 *     id: '123456789',
 *     fallback: FALLBACK_DATA,
 *   });
 *
 * Behavior:
 *   - Aborts in-flight requests on unmount or param change
 *   - Surfaces API errors via `error`
 *   - Returns `fallback` when the request fails and a fallback was provided
 *     (prevents blank UI in production)
 */
export default function useRobloxData({
  type,
  id,
  size,
  fallback = null,
  enabled = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !type || !id) return;

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
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.error || "Unknown API error");
      }
      setData(json.data);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.warn("[useRobloxData] failed:", err);
      setError(err);
      if (fallback !== null && fallback !== undefined) setData(fallback);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [type, id, size, enabled, fallback]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
