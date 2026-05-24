// src/pages/admin/callback.tsx
//
// ─── DEAD CODE — ISOLATED ─────────────────────────────────────────────────────
//
// This module was the entry point for an OAuth PKCE flow that is no longer
// in use. The current auth strategy is email/password (signInWithPassword),
// so this callback path is never exercised in production.
//
// It is retained as an inert redirect guard rather than deleted outright so
// that any bookmarked or cached /admin/callback URLs (e.g. from old OAuth
// redirect_uri configs) land somewhere reasonable instead of a 404.
//
// ACTION: if the OAuth flow is never being re-introduced, this file can be
// safely deleted and its route entry removed from the router.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Unconditionally redirect to the admin login page.
    // No OAuth tokens are parsed or stored.
    navigate("/admin");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
