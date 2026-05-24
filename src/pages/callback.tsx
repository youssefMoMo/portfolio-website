// src/pages/admin/callback.tsx
//
// ── DEAD CODE — ISOLATED & DOCUMENTED ────────────────────────────────────────
//
// STATUS: Inert redirect guard. No OAuth tokens are parsed, stored, or acted on.
//
// HISTORY:
//   This module was the PKCE OAuth callback handler used when the admin auth flow
//   relied on Supabase's OAuth provider integration (Discord OAuth, GitHub OAuth,
//   or similar). The flow looked like:
//
//     1. Admin initiates OAuth → Supabase redirects to this URL after consent.
//     2. This component would extract the authorization code from the query string,
//        exchange it for a session via supabase.auth.exchangeCodeForSession(), and
//        then redirect to /admin/dashboard.
//
// CURRENT STATE:
//   The auth strategy was changed to email/password (signInWithPassword). The OAuth
//   flow is entirely decommissioned. This file is retained only so that:
//
//     a) Any bookmarked or cached /admin/callback URLs (e.g. from old redirect_uri
//        configurations in Supabase or third-party OAuth apps) land on a valid route
//        rather than a 404 or unhandled router fallthrough.
//     b) No silent errors appear in server-side access logs from stale redirects.
//
// ROUTING BEHAVIOUR:
//   Unconditionally redirects to /admin (the login page). The redirect fires in
//   a useEffect so the component briefly renders a spinner — this prevents a flash
//   of blank content before the router transition completes.
//
// CLEANUP ACTION:
//   If the OAuth flow is confirmed as permanently retired:
//     1. Delete this file.
//     2. Remove the /admin/callback route entry from the router (src/App.tsx or
//        equivalent).
//     3. Remove the redirect_uri from any Supabase OAuth provider configurations.
//
//   If the OAuth flow is re-introduced in the future:
//     1. Replace the useEffect body with a proper PKCE code exchange:
//          const { error } = await supabase.auth.exchangeCodeForSession(
//            new URL(window.location.href).searchParams.get("code") ?? "",
//          );
//          navigate(error ? "/admin" : "/admin/dashboard");
//     2. Ensure PKCE is enabled in Supabase → Auth → URL Configuration.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Unconditional redirect — no OAuth state is parsed or consumed.
    navigate("/admin");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
