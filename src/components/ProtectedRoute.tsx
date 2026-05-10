// src/components/ProtectedRoute.tsx
// Gates admin routes. Checks (in order):
//   1. Supabase is configured
//   2. A session exists in localStorage (fast sync check, prevents spinner flash)
//   3. The session belongs to an active row in admin_users (full async check)
// On any failure → redirects to /admin (the login screen).

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAuthenticatedSync, verifyAdmin } from "@/lib/auth";

interface ProtectedRouteProps { children: React.ReactNode }

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
    // No Supabase = no admin access at all.
    if (!supabase) {
      navigate("/admin");
      return;
    }

    // Fast sync check: cached session must exist and not be expired.
    if (!isAuthenticatedSync()) {
      navigate("/admin");
      return;
    }

    // Full verification: session is real AND user is in admin_users.
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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
