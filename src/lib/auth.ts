// src/lib/auth.ts
// Admin authentication via Supabase Auth (email + password).
// Authorisation is enforced by checking that the authenticated user's UUID
// exists in the `admin_users` table with `is_active = true`.
//
// There are NO development fallbacks, NO hardcoded credentials, and NO bypass
// paths. If Supabase is not configured, every auth call fails with a clear
// error — admin-only routes simply cannot be accessed.

import { supabase, isSupabaseEnabled, SUPABASE_AUTH_STORAGE_KEY } from "./supabase";

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
}

const SUPABASE_NOT_CONFIGURED =
  "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, then redeploy.";

// ── Sign in ──────────────────────────────────────────────────────────────────
// Calls supabase.auth.signInWithPassword, then verifies the resulting user
// is registered as an active admin. If verification fails, the session is
// signed out so a non-admin user can never linger in a half-authenticated
// state.
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthResponse> {
  if (!isSupabaseEnabled) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: "Email and password are required." };
  }

  // Step 1 — credentials check
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data?.user) {
    return {
      success: false,
      error: error?.message ?? "Invalid email or password.",
    };
  }

  // Step 2 — admin membership check
  const { data: adminRow, error: adminErr } = await supabase
    .from("admin_users")
    .select("id, is_active")
    .eq("id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminErr || !adminRow) {
    // Drop the session so the user isn't half-logged-in
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    return {
      success: false,
      error: "This account is not authorised to access the admin panel.",
    };
  }

  // Best-effort last_login update (do not block on failure)
  void supabase
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.user.id);

  return { success: true, email: cleanEmail };
}

// ── Verify the current session belongs to an active admin ────────────────────
// Used by ProtectedRoute on each mount.
export async function verifyAdmin(): Promise<AuthResponse> {
  if (!isSupabaseEnabled) return { success: false, error: SUPABASE_NOT_CONFIGURED };
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: "No active session" };

    const { data: adminRow, error: dbErr } = await supabase
      .from("admin_users")
      .select("id, is_active")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (dbErr || !adminRow) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      return { success: false, error: "Not authorised as admin" };
    }
    return { success: true, email: user.email ?? "" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Verification failed",
    };
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────
export async function getSession() {
  if (!isSupabaseEnabled) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function isAuthenticated(): Promise<boolean> {
  return !!(await getSession());
}

// Synchronous check using the cached Supabase session token in localStorage.
// Used by ProtectedRoute / AdminLogin to avoid a spinner flash on mount.
// Note: this only proves the user has a (not-yet-expired) session token —
// full admin verification still happens via verifyAdmin().
//
// `SUPABASE_AUTH_STORAGE_KEY` is imported directly from `./supabase` — the
// single source of truth for this key string. It must never be duplicated
// as an inline literal in this file or anywhere else.
export function isAuthenticatedSync(): boolean {
  if (!isSupabaseEnabled) return false;
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    const exp = (parsed as Record<string, unknown>).expires_at;
    if (typeof exp !== "number") return false;
    return exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  if (!isSupabaseEnabled) return;
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}
