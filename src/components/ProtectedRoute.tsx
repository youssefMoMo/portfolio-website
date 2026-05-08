// src/components/ProtectedRoute.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAuthenticatedSync, logout } from "@/lib/auth";

interface ProtectedRouteProps { children: React.ReactNode }

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, navigate]  = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Dev bypass — set by loginDev() when Supabase not configured
    if (sessionStorage.getItem("yd_dev_admin") === "1") {
      if (mountedRef.current) { setAllowed(true); setChecking(false); }
      return;
    }

    // Instant sync check to avoid spinner flash when session is clearly valid
    if (!isAuthenticatedSync()) {
      navigate("/admin");
      return;
    }

    // Full async Supabase verification
    (async () => {
      if (!supabase) {
        if (mountedRef.current) navigate("/admin");
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        if (!session) {
          await logout();
          if (mountedRef.current) navigate("/admin");
          return;
        }
        if (mountedRef.current) setAllowed(true);
      } catch {
        if (mountedRef.current) navigate("/admin");
      } finally {
        if (mountedRef.current) setChecking(false);
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
