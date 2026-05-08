// api/roblox.ts
// Vercel serverless function — Roblox API proxy.
// Contract matches what src/lib/roblox.ts sends:
//   GET /api/roblox?type=univ_id&id=<placeId>
//     → { success: true, data: { universeId: number } }
//   GET /api/roblox?type=thumbnail&id=<universeId>&size=<WxH>
//     → { success: true, data: { data: [{ universeId, thumbnails: [{ imageUrl, state }] }] } }
//   GET /api/roblox?type=universe&id=<universeId>
//     → { success: true, data: { data: [{ id, visits, ... }] } }
// On failure: { success: false, error: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";

const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;

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
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        return fetchWithRetry(url, attempt + 1);
      }
      throw new Error(`Roblox upstream ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      return fetchWithRetry(url, attempt + 1);
    }
    throw err;
  }
}

function getParam(req: VercelRequest, key: string): string | undefined {
  const v = req.query[key];
  if (typeof v === "string" && v.length > 0) return v;
  if (Array.isArray(v) && v[0]) return String(v[0]);
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS + caching
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const type = getParam(req, "type");
  const id = getParam(req, "id");
  const size = getParam(req, "size") || "768x432";

  if (!type) {
    return res.status(400).json({ success: false, error: "Missing 'type' param" });
  }
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, error: "Missing or invalid 'id' param" });
  }

  // Edge cache successful responses for 5 min
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  try {
    let data: unknown;

    switch (type) {
      case "univ_id":
      case "universeId": {
        // placeId → universeId
        data = await fetchWithRetry(
          `https://apis.roblox.com/universes/v1/places/${encodeURIComponent(id)}/universe`
        );
        break;
      }

      case "thumbnail":
      case "thumb":
      case "icon": {
        // universeId → thumbnails
        // Note: thumbnails uses Png or Webp; isCircular controls icons specifically
        data = await fetchWithRetry(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${encodeURIComponent(
            id
          )}&size=${encodeURIComponent(size)}&format=Png&countPerUniverse=1&defaults=true`
        );
        break;
      }

      case "universe":
      case "universe_info":
      case "game":
      case "visits": {
        // universeId → game info (includes `visits`)
        data = await fetchWithRetry(
          `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(id)}`
        );
        break;
      }

      default:
        return res
          .status(400)
          .json({ success: false, error: `Unknown type: ${type}` });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ success: false, error: message });
  }
}

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};
