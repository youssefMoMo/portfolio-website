// src/pages/admin/callback.tsx
// After Discord OAuth: verify the user is in admin_users table, then redirect.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { verifyAdmin } from "@/lib/auth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AdminCallback() {
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const [status,  setStatus]  = useState<"checking" | "success" | "error">("checking");
  const [message, setMessage] = useState("Verifying your account…");

  useEffect(() => {
    (async () => {
      try {
        // Let Supabase finish processing the OAuth hash fragment
        await new Promise(r => setTimeout(r, 800));
        setMessage("Checking admin privileges…");

        const result = await verifyAdmin();

        if (result.success) {
          setStatus("success");
          setMessage("Welcome! Redirecting to dashboard…");
          toast({ title: "✅ Welcome!", description: "Admin access verified" });
          setTimeout(() => navigate("/admin/dashboard"), 1200);
        } else {
          setStatus("error");
          setMessage(result.error ?? "Access denied");
          toast({ title: "❌ Access Denied", description: result.error ?? "Not authorised", variant: "destructive" });
          setTimeout(() => navigate("/admin"), 3000);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Authentication failed";
        setStatus("error");
        setMessage(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
        setTimeout(() => navigate("/admin"), 3000);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "checking" && <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />}
        {status === "success"  && <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />}
        {status === "error"    && <XCircle className="w-12 h-12 text-destructive mx-auto" />}
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
