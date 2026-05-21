import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BanPayload {
  sessionId: string;
  reason?: string;
}

export interface UnbanPayload {
  sessionId: string;
  unbanMessage?: string;
}

export interface BroadcastPayload {
  sessionId: string;
  message: string | null; // null clears the message
}

// ─── Ban User ─────────────────────────────────────────────────────────────────
export async function banUser({ sessionId, reason }: BanPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      is_banned: true,
      ban_reason: reason ?? null,
      // Clear any leftover unban / admin messages on fresh ban
      unban_message: null,
      admin_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(`banUser failed: ${error.message}`);
}

// ─── Unban User ───────────────────────────────────────────────────────────────
export async function unbanUser({ sessionId, unbanMessage }: UnbanPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      is_banned: false,
      ban_reason: null,
      unban_message: unbanMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(`unbanUser failed: ${error.message}`);
}

// ─── Send / Clear Admin Message ───────────────────────────────────────────────
export async function sendAdminMessage({ sessionId, message }: BroadcastPayload) {
  const { error } = await supabase
    .from("user_sessions")
    .update({
      admin_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(`sendAdminMessage failed: ${error.message}`);
}

// ─── Clear Admin Message ──────────────────────────────────────────────────────
export async function clearAdminMessage(sessionId: string) {
  return sendAdminMessage({ sessionId, message: null });
}

// ─── Clear Unban Message (called after client acknowledges) ───────────────────
export async function clearUnbanMessage(sessionId: string) {
  const { error } = await supabase
    .from("user_sessions")
    .update({ unban_message: null, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw new Error(`clearUnbanMessage failed: ${error.message}`);
}
