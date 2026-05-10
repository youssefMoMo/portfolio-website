// src/pages/admin/callback.tsx
// OAuth callback path — kept for backward compatibility with any old links.
// The current auth flow is email/password (signInWithPassword), so this page
// just redirects to the login screen.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/admin");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
