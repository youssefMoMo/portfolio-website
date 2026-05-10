// src/pages/AdminLogin.tsx
// Admin login screen — Supabase email/password auth.
// No hardcoded credentials, no dev panel. If Supabase env vars are missing,
// show a clear configuration message instead of a fallback form.

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, LogIn, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseEnabled, getConfigErrorMessage } from "@/lib/supabase";
import { loginWithPassword, isAuthenticatedSync } from "@/lib/auth";

export default function AdminLogin() {
  const [, navigate]                    = useLocation();
  const { toast }                       = useToast();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    if (isAuthenticatedSync()) navigate("/admin/dashboard");
  }, [navigate]);

  // Supabase not configured → can't authenticate at all.
  if (!isSupabaseEnabled) {
    const detail = getConfigErrorMessage();
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-amber-500/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
              <CardTitle className="text-xl font-bold">Supabase not configured</CardTitle>
              <CardDescription className="pt-2">
                Authentication is unavailable until the backend is connected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {detail && (
                <p className="text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 text-xs">
                  {detail}
                </p>
              )}
              <p>Set the following environment variables in your Vercel project, then redeploy:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
              <p className="pt-3 text-xs">
                Get both from Supabase → Settings → API.{" "}
                <strong>Use the project URL only</strong> (e.g. <code>https://xxx.supabase.co</code>) —{" "}
                <strong>never</strong> include <code>/rest/v1</code> or any other path.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setIsLoading(true);
    const result = await loginWithPassword(email, password);
    setIsLoading(false);

    if (result.success) {
      toast({ title: "✅ Signed in", description: "Welcome back to the admin panel." });
      // Slight delay so the toast renders before navigation
      setTimeout(() => navigate("/admin/dashboard"), 200);
      return;
    }

    setError(result.error ?? "Login failed.");
    toast({
      title: "❌ Login failed",
      description: result.error ?? "Invalid credentials.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ willChange: "opacity, transform" }}
      >
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
            <CardDescription>Sign in with your admin account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-muted-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-background/50 border-white/10 pl-10"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-white/10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Admin accounts are managed in Supabase. Contact the site owner to request access.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
