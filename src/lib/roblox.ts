// src/lib/roblox.ts

const API_BASE = "/api/roblox";

async function callApi<T>(params: Record<string, string>): Promise<T | null> {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}?${qs}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success) return null;
    return json.data as T;
  } catch (err) {
    console.warn("[roblox] API call failed:", err);
    return null;
  }
}

/**
 * Resolve one or more placeIds to their corresponding universeIds.
 * Returns a map of placeId -> universeId (string -> string).
 */
export async function getUniverseIds(
  placeIds: (string | number)[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    placeIds.map(async (placeId) => {
      const id = String(placeId);
      const data = await callApi<{ universeId: number | string }>({
        type: "univ_id",
        id,
      });
      if (data?.universeId != null) {
        result[id] = String(data.universeId);
      }
    })
  );
  return result;
}

/**
 * Get thumbnail image URLs for one or more universeIds.
 * Returns a map of universeId -> imageUrl.
 */
export async function getRobloxGameImages(
  universeIds: (string | number)[],
  size: string = "768x432"
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    universeIds.map(async (universeId) => {
      const id = String(universeId);
      const data = await callApi<{
        data?: Array<{
          universeId: number;
          thumbnails?: Array<{ imageUrl?: string; state?: string }>;
        }>;
      }>({
        type: "thumbnail",
        id,
        size,
      });
      const thumb = data?.data?.[0]?.thumbnails?.[0];
      if (thumb?.imageUrl && thumb.state === "Completed") {
        result[id] = thumb.imageUrl;
      }
    })
  );
  return result;
}

/**
 * Get visit counts for one or more universeIds.
 * Returns a map of universeId -> visit count.
 */
export async function getRobloxVisits(
  universeIds: (string | number)[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  await Promise.all(
    universeIds.map(async (universeId) => {
      const id = String(universeId);
      const data = await callApi<{
        data?: Array<{ id: number; visits?: number }>;
      }>({
        type: "universe",
        id,
      });
      const visits = data?.data?.[0]?.visits;
      if (typeof visits === "number") {
        result[id] = visits;
      }
    })
  );
  return result;
}