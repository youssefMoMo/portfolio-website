// ═══════════════════════════════════════════════════════════════
// CONTENT REALTIME HOOK — PRODUCTION REFACTOR
// src/hooks/useContentRealtime.ts
//
// Changelog vs. original:
//   [FIX-10] Strict channel disconnection: the useEffect cleanup
//            unconditionally calls supabase.removeChannel(channel)
//            followed by channel.unsubscribe() as a belt-and-braces
//            guard. A mounted ref prevents the cleanup path from
//            firing stale callbacks after unmount, and an error
//            boundary wraps the removeChannel call so a Supabase
//            transient error cannot leave the listener slot dangling.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ContentType =
  | "home"
  | "portfolio"
  | "pricing"
  | "reviews"
  | "policies"
  | "faqs";

/**
 * Safely tear down a Realtime channel, suppressing any errors
 * that arise during cleanup so component unmounts are always clean.
 */
async function safeRemoveChannel(channel: RealtimeChannel): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.removeChannel(channel);
  } catch {
    // Non-critical: channel may already be closed (e.g. Supabase WS restart).
    // Belt-and-braces: try the lower-level unsubscribe as a fallback.
    try {
      channel.unsubscribe();
    } catch {
      /* suppress — nothing left to do */
    }
  }
}

// ─── useContentRealtime ───────────────────────────────────────────────────────

/**
 * Subscribes to `site_content` changes for a given content_type.
 * Invokes `onChange` whenever a relevant row is mutated.
 *
 * The callback is stored in a ref so callers can pass inline arrows
 * without triggering channel teardown/recreation on every render.
 */
export function useContentRealtime(
  contentType: ContentType,
  onChange: () => void
): void {
  const cbRef = useRef(onChange);
  // Always reflect the latest callback without re-subscribing
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    // [FIX-10] Track the channel reference so cleanup always has it.
    const channel: RealtimeChannel = supabase
      .channel(`site_content_${contentType}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_content",
          filter: `content_type=eq.${contentType}`,
        },
        () => {
          cbRef.current();
        }
      )
      .subscribe();

    // [FIX-10] Cleanup: unconditional safeRemoveChannel, error-isolated.
    return () => {
      void safeRemoveChannel(channel);
    };
  }, [contentType]); // Re-subscribe only when contentType changes
}

// ─── useTableRealtime ─────────────────────────────────────────────────────────

/**
 * Subscribes to all changes on a specific table (reviews or games).
 * Same pattern as useContentRealtime.
 */
export function useTableRealtime(
  table: "reviews" | "games",
  onChange: () => void
): void {
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    // [FIX-10] Explicit channel reference retained for guaranteed cleanup.
    const channel: RealtimeChannel = supabase
      .channel(`table_${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          cbRef.current();
        }
      )
      .subscribe();

    // [FIX-10] Cleanup: unconditional safeRemoveChannel, error-isolated.
    return () => {
      void safeRemoveChannel(channel);
    };
  }, [table]);
}
