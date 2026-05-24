// src/components/ProtectedRoute.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  STORAGE KEY LEAK FIXED
//    • The hardcoded literal `"youssef-portfolio-auth"` is eradicated from this
//      component. No direct localStorage.getItem("youssef-portfolio-auth") call
//      exists anywhere in this file.
//    • Storage key access is centralised in two places only:
//        1. `@/lib/supabase.ts`  — exports `SUPABASE_AUTH_STORAGE_KEY`
//           (single definition, passed to the Supabase client's `storageKey` option)
//        2. `@/lib/auth.ts`      — imports the constant and uses it inside
//           `isAuthenticatedSync()` for the fast sync check
//    • This component delegates both checks to auth.ts helpers:
//        • `isAuthenticatedSync()` — reads the cached session (uses the
//          centralised key under the hood)
//        • `verifyAdmin()`         — full async round-trip: session validity +
//          admin_users table membership
//    • If the storage key ever changes, it is updated in exactly one place
//      (`supabase.ts`) and all consumers pick it up automatically.
//
//  GATE ORDER (unchanged — documented for clarity)
//    1. Supabase configured?        → else navigate to /admin (login)
//    2. Cached session present?     → fast sync check, prevents loading flash
//    3. Session valid + admin row?  → full async check before rendering children

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAuthenticatedSync, verifyAdmin } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, navigate]            = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);
  const mountedRef              = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // ── Gate 1: Supabase must be configured ───────────────────────────────
    if (!supabase) {
      navigate("/admin");
      return;
    }

    // ── Gate 2: fast sync check — avoids a loading spinner flash ─────────
    // isAuthenticatedSync() reads SUPABASE_AUTH_STORAGE_KEY from @/lib/auth.
    // No literal key string is used here.
    if (!isAuthenticatedSync()) {
      navigate("/admin");
      return;
    }

    // ── Gate 3: full async verification — session real + admin_users row ──
    (async () => {
      const result = await verifyAdmin();
      if (!mountedRef.current) return;
      if (result.success) {
        setAllowed(true);
        setChecking(false);
      } else {
        navigate("/admin");
      }
    })();
  }, [navigate]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
