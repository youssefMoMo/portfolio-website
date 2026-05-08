// api/roblox.ts — Vercel serverless: Roblox API proxy with retry + safe fallbacks
import type { VercelRequest, VercelResponse } from "@vercel/node";

const TIMEOUT_MS = 9_000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, attempt = 0): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; PortfolioProxy/2.0)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (attempt < MAX_RETRIES && res.status >= 500) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        return fetchWithRetry(url, attempt + 1);
      }
      return null;
    }
    return await res.json();
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      return fetchWithRetry(url, attempt + 1);
    }
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { type, ids, placeId } = req.query as Record<string, string>;

  try {
    switch (type) {
      case "universe": {
        if (!placeId?.trim()) return res.status(400).json({ universeId: null });
        const data = await fetchWithRetry(
          `https://apis.roblox.com/universes/v1/places/${encodeURIComponent(placeId.trim())}/universe`
        ) as { universeId?: number } | null;
        return res.json({ universeId: data?.universeId ?? null });
      }

      case "universe-batch": {
        if (!ids?.trim()) return res.json([]);
        const placeIds = ids.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);
        if (placeIds.length === 0) return res.json([]);
        const qs = placeIds.map(id => `placeIds=${encodeURIComponent(id)}`).join("&");
        const data = await fetchWithRetry(
          `https://games.roblox.com/v1/games/multiget-place-details?${qs}`
        ) as { placeId?: number; universeId?: number }[] | null;
        return res.json(Array.isArray(data) ? data : []);
      }

      case "thumbnails": {
        if (!ids?.trim()) return res.json({ data: [] });
        const universeIds = ids.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50).join(",");
        if (!universeIds) return res.json({ data: [] });
        const data = await fetchWithRetry(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(universeIds)}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
        ) as { data?: unknown[] } | null;
        return res.json({ data: data?.data ?? [] });
      }

      case "visits": {
        if (!ids?.trim()) return res.json({ data: [] });
        const universeIds = ids.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50).join(",");
        if (!universeIds) return res.json({ data: [] });
        const data = await fetchWithRetry(
          `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(universeIds)}`
        ) as { data?: unknown[] } | null;
        return res.json({ data: data?.data ?? [] });
      }

      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }
  } catch (err) {
    console.error("[api/roblox] unhandled error:", err);
    // Always return safe fallback — never let the API crash the UI
    const safeFallbacks: Record<string, unknown> = {
      universe: { universeId: null },
      "universe-batch": [],
      thumbnails: { data: [] },
      visits: { data: [] },
    };
    return res.status(200).json(safeFallbacks[type] ?? {});
  }
}
