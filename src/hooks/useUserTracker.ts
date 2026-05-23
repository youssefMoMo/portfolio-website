// src/hooks/useUserTracker.ts
// ─── DIAGNOSTIC BUILD — verbose console logging on every step ─────────────────
import { useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeoData {
  country: string;
}

interface SessionMeta {
  sessionToken: string;
  country: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_KEY           = "youssef_session_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

// ─── Geo providers ────────────────────────────────────────────────────────────
const GEO_PROVIDERS: Array<{
  url: string;
  extract: (data: Record<string, unknown>) => GeoData | null;
}> = [
  {
    url: "https://ipapi.co/json/",
    extract(data) {
      const country = String(data.country_name || "").trim();
      if (!country || country === "undefined") return null;
      return { country };
    },
  },
  {
    url: "https://ipwho.is/",
    extract(data) {
      if (!data.success) return null;
      const country = String(data.country || "").trim();
      if (!country) return null;
      return { country };
    },
  },
  {
    url: "http://ip-api.com/json/?fields=status,country",
    extract(data) {
      if (String(data.status) !== "success") return null;
      const country = String(data.country || "").trim();
      if (!country) return null;
      return { country };
    },
  },
];

async function resolveGeoData(): Promise<GeoData> {
  console.log("[Tracker Geo] Starting geo resolution, trying", GEO_PROVIDERS.length, "providers...");
  for (const provider of GEO_PROVIDERS) {
    try {
      console.log("[Tracker Geo] Trying provider:", provider.url);
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 4_000);
      const res        = await fetch(provider.url, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeout);
      if (!res.ok) {
        console.log("[Tracker Geo] Provider returned non-OK status:", res.status, provider.url);
        continue;
      }
      const json = (await res.json()) as Record<string, unknown>;
      const geo  = provider.extract(json);
      if (geo && geo.country && geo.country !== "Unknown") {
        console.log("[Tracker Geo] ✅ Resolved country:", geo.country, "via", provider.url);
        return geo;
      }
      console.log("[Tracker Geo] Provider returned no usable country:", provider.url, json);
    } catch (err) {
      console.log("[Tracker Geo] Provider threw:", provider.url, err);
    }
  }
  console.warn("[Tracker Geo] ⚠️ All geo providers failed — falling back to Unknown");
  return { country: "Unknown" };
}

// ─── UUID ─────────────────────────────────────────────────────────────────────
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Session token ────────────────────────────────────────────────────────────
function getOrCreateSessionToken(): { token: string; isNew: boolean } {
  console.log("[Tracker Init] Checking token in localStorage (key:", SESSION_KEY, ")...");
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) {
      console.log("[Tracker Init] ✅ Found existing token:", existing.slice(0, 8) + "...");
      return { token: existing, isNew: false };
    }
    const fresh = generateUUID();
    localStorage.setItem(SESSION_KEY, fresh);
    console.log("[Tracker Init] 🆕 Generated NEW token:", fresh.slice(0, 8) + "... → saved to localStorage");
    return { token: fresh, isNew: true };
  } catch (err) {
    console.warn("[Tracker Init] ⚠️ localStorage unavailable (private mode?), generating ephemeral token. Error:", err);
    return { token: generateUUID(), isNew: true };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUserTracker(currentPage: string) {
  const sessionInfoRef = useRef<{ token: string; isNew: boolean }>(
    getOrCreateSessionToken()
  );

  const metaRef        = useRef<SessionMeta | null>(null);
  const currentPageRef = useRef<string>(currentPage);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialisedRef = useRef(false);

  // Keep the page ref fresh on every navigation
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // ── Hard INSERT — brand-new visitors only ─────────────────────────────────
  async function hardInsertSession(page: string): Promise<void> {
    console.log("[Tracker Status] isSupabaseEnabled:", isSupabaseEnabled);
    if (!isSupabaseEnabled) {
      console.error("[Tracker Error] ❌ Supabase is NOT enabled — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars!");
      return;
    }
    if (!metaRef.current) {
      console.error("[Tracker Error] ❌ hardInsertSession called but metaRef is null — geo not resolved yet");
      return;
    }

    const now = new Date().toISOString();
    console.log("[Tracker Ingest] 🚀 Triggering hard INSERT for token:", metaRef.current.sessionToken.slice(0, 8) + "...", "| page:", page, "| country:", metaRef.current.country, "| now:", now);

    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          session_token: metaRef.current.sessionToken,
          current_page:  page,
          country:       metaRef.current.country,
          last_seen:     now,
          updated_at:    now,
        })
        .select();  // Forces PostgREST to return the row — confirms the write landed

      if (error) {
        if (error.code === "23505") {
          // Row already exists — not fatal, heartbeat will refresh it
          console.log("[Tracker Ingest] ℹ️ INSERT conflict (23505) — row already exists for this token. Will upsert instead.");
          await upsertSession(page);
        } else {
          console.error("[Tracker Error] ❌ hard INSERT failed. Full error object:", JSON.stringify(error, null, 2));
          console.error("[Tracker Error] error.message:", error.message, "| error.code:", error.code, "| error.details:", error.details, "| error.hint:", error.hint);
        }
      } else {
        console.log("[Tracker Ingest] ✅ Hard INSERT succeeded. Returned row(s):", JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error("[Tracker Error] ❌ Catch block caught during hard INSERT:", err);
      console.error("[Tracker Error] Stringified:", JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    }
  }

  // ── Upsert — heartbeats and returning visitors ────────────────────────────
  async function upsertSession(page: string): Promise<void> {
    console.log("[Tracker Status] isSupabaseEnabled:", isSupabaseEnabled);
    if (!isSupabaseEnabled) {
      console.error("[Tracker Error] ❌ Supabase is NOT enabled — upsert aborted");
      return;
    }
    if (!metaRef.current) {
      console.warn("[Tracker Heartbeat] ⚠️ upsertSession called but metaRef is null — skipping");
      return;
    }

    const now = new Date().toISOString();
    console.log("[Tracker Heartbeat] 💓 Triggering upsert for token:", metaRef.current.sessionToken.slice(0, 8) + "...", "| page:", page, "| now:", now);

    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .upsert(
          {
            session_token: metaRef.current.sessionToken,
            current_page:  page,
            country:       metaRef.current.country,
            last_seen:     now,
            updated_at:    now,
          },
          { onConflict: "session_token" }
        )
        .select();  // Confirms the upsert actually wrote to the DB

      if (error) {
        console.error("[Tracker Error] ❌ Upsert failed. Full error object:", JSON.stringify(error, null, 2));
        console.error("[Tracker Error] error.message:", error.message, "| error.code:", error.code, "| error.details:", error.details, "| error.hint:", error.hint);
      } else {
        console.log("[Tracker Heartbeat] ✅ Upsert succeeded. Returned row(s):", JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error("[Tracker Error] ❌ Catch block caught during upsert:", err);
      console.error("[Tracker Error] Stringified:", JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    }
  }

  // ── Init once: geo → first write → heartbeat ─────────────────────────────
  useEffect(() => {
    if (initialisedRef.current) {
      console.log("[Tracker Init] ⏩ Already initialised — skipping duplicate mount");
      return;
    }
    initialisedRef.current = true;

    console.log("[Tracker Init] 🟢 Mount on page:", currentPage);
    console.log("[Tracker Init] Token info:", {
      token: sessionInfoRef.current.token.slice(0, 8) + "...",
      isNew: sessionInfoRef.current.isNew,
    });

    let cancelled = false;

    async function init() {
      try {
        const geo = await resolveGeoData();
        if (cancelled) {
          console.log("[Tracker Init] Component unmounted before geo resolved — aborting init");
          return;
        }

        metaRef.current = {
          sessionToken: sessionInfoRef.current.token,
          country:      geo.country,
        };

        console.log("[Tracker Init] Meta ready:", {
          token:   metaRef.current.sessionToken.slice(0, 8) + "...",
          country: metaRef.current.country,
          isNew:   sessionInfoRef.current.isNew,
        });

        // New visitor → hard INSERT; returning visitor → upsert to refresh timestamps
        if (sessionInfoRef.current.isNew) {
          console.log("[Tracker Init] 🆕 New visitor path → hard INSERT");
          await hardInsertSession(currentPageRef.current);
        } else {
          console.log("[Tracker Init] 🔄 Returning visitor path → upsert to refresh last_seen");
          await upsertSession(currentPageRef.current);
        }

        if (cancelled) return;

        console.log("[Tracker Init] ⏰ Starting heartbeat every", HEARTBEAT_INTERVAL_MS / 1000, "s");
        heartbeatTimer.current = setInterval(() => {
          console.log("[Tracker Heartbeat] ⏰ Interval fired — page:", currentPageRef.current);
          upsertSession(currentPageRef.current);
        }, HEARTBEAT_INTERVAL_MS);

      } catch (err) {
        console.error("[Tracker Error] ❌ Catch block caught during init:", err);
        console.error("[Tracker Error] Stringified:", JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
      }
    }

    init();

    const handleUnload = () => {
      if (!metaRef.current) return;
      console.log("[Tracker Unload] Tab closing — sending beacon for token:", metaRef.current.sessionToken.slice(0, 8) + "...");
      try {
        navigator.sendBeacon("/api/session-end?token=" + metaRef.current.sessionToken);
        supabase
          .from("user_sessions")
          .delete()
          .eq("session_token", metaRef.current.sessionToken)
          .then(() => {});
      } catch {
        // unload errors are expected
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cancelled = true;
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        console.log("[Tracker Cleanup] Heartbeat cleared");
      }
      window.removeEventListener("beforeunload", handleUnload);
      console.log("[Tracker Cleanup] Event listener removed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Page-change: immediately push new page on navigation ─────────────────
  useEffect(() => {
    if (!metaRef.current) {
      console.log("[Tracker Nav] Page changed to", currentPage, "but geo not ready yet — heartbeat will catch it");
      return;
    }
    console.log("[Tracker Nav] 📍 Page changed to:", currentPage, "— pushing update immediately");
    upsertSession(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
}
