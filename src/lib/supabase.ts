// src/lib/supabase.ts
//
// Hardened Supabase client initialisation.
//
// Real-world bug we defend against: when VITE_SUPABASE_URL is set to
// "https://xxx.supabase.co/rest/v1" (a common copy-paste mistake — the
// REST endpoint URL instead of the project URL), the Supabase JS client
// appends its own "/rest/v1" again, so every request goes to
// "/rest/v1/rest/v1/..." and 404s. The fix is to sanitise the URL at
// boot: strip any trailing API path the user accidentally included.
//
// We also validate the anon key looks JWT-shaped, and expose a
// `configStatus` export so the UI can show a precise error instead of
// a generic "not configured" message.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────
export type ConfigStatus =
  | { ok: true;  url: string;            }
  | { ok: false; reason: ConfigError; detail?: string };

export type ConfigError =
  | "missing_url"
  | "missing_key"
  | "url_invalid_protocol"
  | "url_invalid_host"
  | "url_includes_api_path"  // we auto-fix this; only surfaced as a warning
  | "key_invalid_shape";

// ─── Sanitise the URL ────────────────────────────────────────────
function sanitiseUrl(raw: string): { clean: string; modified: boolean } {
  let url = raw.trim();
  if (!url) return { clean: "", modified: false };

  url = url.replace(/[\s'"]+$/g, "");
  url = url.replace(/\/+$/g, "");

  const apiPathRe = /\/(rest|auth|storage|realtime|functions)\/v\d+\/?$/i;
  let modified = false;
  while (apiPathRe.test(url)) {
    url = url.replace(apiPathRe, "");
    modified = true;
  }

  url = url.replace(/\/+$/g, "");

  return { clean: url, modified: modified || raw.trim() !== url };
}

// ─── Validate ────────────────────────────────────────────────────
function validate(rawUrl: string | undefined, rawKey: string | undefined): ConfigStatus {
  if (!rawUrl) return { ok: false, reason: "missing_url" };
  if (!rawKey) return { ok: false, reason: "missing_key" };

  const { clean, modified } = sanitiseUrl(rawUrl);

  if (!/^https:\/\//i.test(clean)) {
    return { ok: false, reason: "url_invalid_protocol", detail: clean };
  }

  let host = "";
  try {
    host = new URL(clean).host;
  } catch {
    return { ok: false, reason: "url_invalid_host", detail: clean };
  }
  if (!host) return { ok: false, reason: "url_invalid_host", detail: clean };

  const key = rawKey.trim();
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    return { ok: false, reason: "key_invalid_shape" };
  }

  if (modified) {
    // eslint-disable-next-line no-console
    console.warn(
      `[supabase] VITE_SUPABASE_URL contained an API path (e.g. "/rest/v1"). ` +
      `Auto-corrected to "${clean}". ` +
      `Please update your env var to the project URL only — see Supabase → Settings → API → "Project URL".`,
    );
  }

  return { ok: true, url: clean };
}

// ─── Boot ────────────────────────────────────────────────────────
const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configStatus: ConfigStatus = validate(rawUrl, rawKey);

if (!configStatus.ok && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    `[supabase] Disabled — reason="${configStatus.reason}"` +
    (configStatus.detail ? ` detail="${configStatus.detail}"` : "") +
    ". Set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

const browserStorage =
  typeof window !== "undefined" ? window.localStorage : undefined;

// الحل هنا: بنضمن دايماً تصدير كائن SupabaseClient صالح ومستقر لتجنب انهيار المشروع
export const supabase: SupabaseClient = createClient(
  configStatus.ok ? configStatus.url : "https://placeholder-project-url.supabase.co",
  configStatus.ok ? (rawKey as string).trim() : "placeholder-anon-key.placeholder-segment.placeholder-key",
  {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: true,
      storage:            browserStorage,
      storageKey:         "youssef-portfolio-auth",
    },
    global: {
      headers: { "x-application-name": "youssef-portfolio" },
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

export const isSupabaseEnabled = configStatus.ok;

// Human-readable explanation for the UI to display
export function getConfigErrorMessage(): string | null {
  if (configStatus.ok) return null;
  switch (configStatus.reason) {
    case "missing_url":
      return "VITE_SUPABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.";
    case "missing_key":
      return "VITE_SUPABASE_ANON_KEY is not set. Add it in Vercel → Settings → Environment Variables.";
    case "url_invalid_protocol":
      return `VITE_SUPABASE_URL must start with https:// — got "${configStatus.detail}".`;
    case "url_invalid_host":
      return `VITE_SUPABASE_URL is not a valid URL — got "${configStatus.detail}".`;
    case "key_invalid_shape":
      return "VITE_SUPABASE_ANON_KEY does not look like a Supabase anon key. Copy the 'anon public' key from Supabase → Settings → API.";
    case "url_includes_api_path":
      return "VITE_SUPABASE_URL should be just the project URL (e.g. https://xxx.supabase.co), without /rest/v1.";
  }
}

// ─── Database types ──────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_content: {
        Row: {
          id: string;
          content_type: "home" | "portfolio" | "pricing" | "reviews" | "policies";
          content_key: string;
          content_value: unknown;
          is_published: boolean;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_type: "home" | "portfolio" | "pricing" | "reviews" | "policies";
          content_key: string;
          content_value: unknown;
          is_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_type?: "home" | "portfolio" | "pricing" | "reviews" | "policies";
          content_key?: string;
          content_value?: unknown;
          is_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};