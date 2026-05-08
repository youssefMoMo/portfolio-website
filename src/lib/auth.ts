// src/lib/auth.ts — Supabase-only auth (no server JWT, no PHP backend)
// Flow: Discord OAuth → Supabase session → admin_users table check

import { supabase, isSupabaseEnabled } from "./supabase";

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  discordId?: string;
}

// ── Discord OAuth ──────────────────────────────────────────────
export async function loginWithDiscord(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${window.location.origin}/admin/callback`,
      scopes: "identify",
    },
  });
  if (error) throw error;
}

// ── Check admin privileges after OAuth callback ────────────────
// Queries admin_users table directly via Supabase (RLS-protected).
export async function verifyAdmin(): Promise<AuthResponse> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: "No active session" };

    // Discord user ID is stored in provider metadata
    const meta       = user.user_metadata ?? {};
    const discordId  = meta.provider_id ?? meta.sub ?? "";

    if (!discordId) return { success: false, error: "Could not extract Discord ID" };

    // Check admin_users table — RLS ensures only own row is readable
    const { data, error: dbErr } = await supabase
      .from("admin_users")
      .select("id, discord_username")
      .eq("discord_id", discordId)
      .eq("is_active", true)
      .maybeSingle();

    if (dbErr || !data) {
      return { success: false, error: "Not authorised as admin" };
    }

    // Update last_login (best-effort)
    supabase
      .from("admin_users")
      .update({
        last_login:       new Date().toISOString(),
        discord_username: meta.full_name ?? meta.name ?? null,
        discord_avatar:   meta.avatar_url ?? null,
      })
      .eq("discord_id", discordId)
      .then(() => {});

    return { success: true, discordId };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}

// ── Session helpers ────────────────────────────────────────────
export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Synchronous check using the cached Supabase session state
// (used by ProtectedRoute for instant render without extra await)
export function isAuthenticatedSync(): boolean {
  if (!supabase) return false;
  // Supabase stores session in localStorage under storageKey
  const storageKey = "youssef-portfolio-auth";
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const exp    = parsed?.expires_at ?? 0;
    return exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  if (supabase) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
}

// ── Dev fallback (when Supabase is not configured) ─────────────
// Credentials come from .env — never hardcoded.
export async function loginDev(discordId: string, password: string): Promise<AuthResponse> {
  if (isSupabaseEnabled) return { success: false, message: "Use Discord OAuth" };
  const envId  = import.meta.env.VITE_DEV_ADMIN_ID;
  const envPwd = import.meta.env.VITE_DEV_ADMIN_PASSWORD;
  if (!envId || !envPwd) return { success: false, error: "Set VITE_DEV_ADMIN_ID and VITE_DEV_ADMIN_PASSWORD in .env" };
  if (discordId === envId && password === envPwd) {
    // Store a temporary flag so ProtectedRoute passes in dev mode
    sessionStorage.setItem("yd_dev_admin", "1");
    return { success: true, discordId };
  }
  return { success: false, message: "Invalid credentials" };
}
