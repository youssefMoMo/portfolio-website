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
//
// When credentials are absent or invalid, `supabase` is a recursive
// JavaScript Proxy that intercepts every method-chain call and throws
// a highly descriptive developer error — no silent dummy client, no
// swallowed failures, no misleading "success" responses.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Centralised storage key ─────────────────────────────────────────────────
// Single source of truth for the localStorage key used by Supabase Auth.
// Import this constant wherever you need to read/check the auth session token
// (e.g. auth.ts → isAuthenticatedSync). Never hard-code the string elsewhere.
export const SUPABASE_AUTH_STORAGE_KEY = "youssef-portfolio-auth";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ConfigStatus =
  | { ok: true;  url: string;            }
  | { ok: false; reason: ConfigError; detail?: string };

export type ConfigError =
  | "missing_url"
  | "missing_key"
  | "url_invalid_protocol"
  | "url_invalid_host"
  | "url_includes_api_path"  // auto-fixed; surfaced as a warning only
  | "key_invalid_shape";

// ─── URL sanitiser ────────────────────────────────────────────────────────────
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

// ─── Validator ────────────────────────────────────────────────────────────────
function validate(
  rawUrl: string | undefined,
  rawKey: string | undefined,
): ConfigStatus {
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

// ─── Disabled-client Proxy factory ────────────────────────────────────────────
//
// When credentials are missing/invalid we must NOT create a real SupabaseClient
// with placeholder values — that would silently send real HTTP requests to a
// dummy host and swallow the failures, making misconfiguration extremely hard
// to debug.
//
// Instead we return a recursive Proxy that intercepts every property access and
// function call in any method chain (e.g. supabase.from('x').select('*')) and
// immediately throws a descriptive, actionable error that names exactly what
// call was intercepted and exactly how to fix it.
//
// The Proxy is recursive: accessing any property returns another Proxy, so
// arbitrarily deep chains (supabase.auth.signInWithPassword, supabase.from()
// .select().eq()...) all hit the apply trap and throw.
function createDisabledClientProxy(): SupabaseClient {
  const makeProxy = (chainPath: string): object => {
    return new Proxy(
      // Use a function as the proxy target so the `apply` trap fires when
      // callers invoke any node in the chain as a function.
      function __disabledSupabase() {} as object,
      {
        get(_target: object, prop: string | symbol): unknown {
          // Let well-known symbols (Symbol.toPrimitive, Symbol.iterator, etc.)
          // pass through as undefined so JSON.stringify and `instanceof` don't
          // explode before the error message can be shown.
          if (typeof prop === "symbol") return undefined;

          // Recurse: property access returns another Proxy one level deeper.
          return makeProxy(`${chainPath}.${String(prop)}`);
        },

        apply(_target: object, _thisArg: unknown, _args: unknown[]): never {
          const msg =
            `[supabase] ⛔  "${chainPath}()" was intercepted on a DISABLED Supabase client.\n` +
            `\n` +
            `  Root cause:   VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid.\n` +
            `  Config status: ${JSON.stringify(configStatus)}\n` +
            `\n` +
            `  Resolution:\n` +
            `    1. Copy your Project URL from Supabase → Settings → API → "Project URL".\n` +
            `    2. Copy your anon/public key from Supabase → Settings → API → "anon public".\n` +
            `    3. Add both to .env.local:\n` +
            `         VITE_SUPABASE_URL=https://<ref>.supabase.co\n` +
            `         VITE_SUPABASE_ANON_KEY=<your-anon-key>\n` +
            `    4. For production: add these in Vercel → Settings → Environment Variables.\n` +
            `\n` +
            `  Prevention:   Guard all Supabase calls with \`if (!isSupabaseEnabled) return;\``;

          // eslint-disable-next-line no-console
          console.error(msg);
          throw new Error(msg);
        },
      },
    );
  };

  return makeProxy("supabase") as unknown as SupabaseClient;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
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

export const isSupabaseEnabled: boolean = configStatus.ok;

// ─── Client export ────────────────────────────────────────────────────────────
//
// `supabase` is EITHER:
//   • A fully initialised SupabaseClient (when isSupabaseEnabled === true), OR
//   • A recursive Proxy that throws descriptive errors on any call
//     (when isSupabaseEnabled === false).
//
// Consumers MUST check `isSupabaseEnabled` before calling any method. The Proxy
// acts as a last-resort safeguard — not an alternative to the flag check.
const browserStorage: Storage | undefined =
  typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase: SupabaseClient = isSupabaseEnabled
  ? createClient(
      (configStatus as { ok: true; url: string }).url,
      (rawKey as string).trim(),
      {
        auth: {
          autoRefreshToken:   true,
          persistSession:     true,
          detectSessionInUrl: true,
          storage:            browserStorage,
          storageKey:         SUPABASE_AUTH_STORAGE_KEY,
        },
        global: {
          headers: { "x-application-name": "youssef-portfolio" },
        },
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      },
    )
  : createDisabledClientProxy();

// ─── Config error messages (for UI display) ───────────────────────────────────
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

// ─── Database types ───────────────────────────────────────────────────────────
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
