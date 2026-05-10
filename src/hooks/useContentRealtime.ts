// src/hooks/useContentRealtime.ts
//
// Subscribes to Supabase Realtime changes on the `site_content` table for a
// specific content_type (or to a different table for reviews/games), and
// invokes a callback so the page can re-fetch.
//
// IMPORTANT: callers usually pass an inline arrow function. To prevent the
// subscription from being torn down and re-created on every render, the
// callback is held in a ref. The effect only re-runs when the table /
// content_type itself changes (which it never does in practice).

import { useEffect, useRef } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

type ContentType = "home" | "portfolio" | "pricing" | "reviews" | "policies";

export function useContentRealtime(
  contentType: ContentType,
  onChange: () => void,
) {
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel(`site_content_${contentType}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "site_content",
          filter: `content_type=eq.${contentType}`,
        },
        () => { cbRef.current(); },
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [contentType]);
}

export function useTableRealtime(
  table: "reviews" | "games",
  onChange: () => void,
) {
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    const channel = supabase
      .channel(`table_${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => { cbRef.current(); },
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [table]);
}
