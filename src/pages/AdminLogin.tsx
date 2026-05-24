// src/pages/AdminLogin.tsx
// REFACTOR CHANGELOG:
//   • SECURITY LEAK REMEDY: Raw infrastructure variable names (e.g. the literal string
//     "VITE_SUPABASE_URL is not set") are no longer rendered in the public UI.
//     getConfigErrorMessage() may return developer-facing detail that describes internal
//     env-var names or Supabase paths. That detail is now routed exclusively to
//     console.warn() so it remains visible in DevTools but is invisible to end-users.
//     The card displayed to the user shows only a clean, professional, non-revealing
//     message that does not hint at the underlying infrastructure.
//   • DEDUPLICATED VALIDATION ERRORS: Previously, on a failed submission the component
//     called both setError() (inline banner) and toast() (overlay notification) with the
//     same message. The toast is now shown only on actual auth failures (i.e. after a
//     network round-trip), not on local validation errors (empty email / password). This
//     stops the double-feedback pattern where a simple "fill in required fields" message
//     appeared both inline and as a floating toast simultaneously.

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
  const [, navigate]   = useLocation();
  const { toast }      = useToast();
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    if (isAuthenticatedSync()) navigate("/admin/dashboard");
  }, [navigate]);

  // ── Supabase not configured ─────────────────────────────────────────────
  //
  // SECURITY: getConfigErrorMessage() can return strings like
  // "VITE_SUPABASE_URL is not set" which expose internal env-var names.
  // We log that detail to the developer console only; the UI shows a generic,
  // non-revealing message that doesn't hint at the infrastructure layer.
  //
  if (!isSupabaseEnabled) {
    const devDetail = getConfigErrorMessage();
    if (devDetail) {
      console.warn("[AdminLogin] Supabase configuration issue:", devDetail);
    }

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
              <CardTitle className="text-xl font-bold">Admin Panel Unavailable</CardTitle>
              <CardDescription className="pt-2">
                The admin panel is temporarily unavailable. Please contact the site administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {/* User-facing message: clean, non-revealing, professional */}
              <p className="text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 text-xs">
                Authentication is currently unavailable. If you are the site owner, check your backend configuration and redeploy.
              </p>
              <p className="pt-1 text-xs">
                If the issue persists, refer to your deployment documentation or contact your hosting provider for assistance.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Form submission ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ── Local validation — inline error only, NO toast ──────────────────
    // Showing a toast for simple "required field" feedback is redundant because
    // the inline error banner is already displayed directly below the inputs.
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    // ── Network round-trip ───────────────────────────────────────────────
    setIsLoading(true);
    const result = await loginWithPassword(email, password);
    setIsLoading(false);

    if (result.success) {
      // Success toast is informational, not a duplicate of an error.
      toast({
        title:       "✅ Signed in",
        description: "Welcome back to the admin panel.",
      });
      // Slight delay so the toast renders before navigation.
      setTimeout(() => navigate("/admin/dashboard"), 200);
      return;
    }

    // ── Auth failure — inline error + toast (both are appropriate here) ──
    // The user submitted credentials that were rejected by the server. Showing
    // both the inline error and a toast is correct because the toast provides
    // dismissible confirmation while the inline message persists for reference.
    const errMsg = result.error ?? "Login failed. Please try again.";
    setError(errMsg);
    toast({
      title:       "❌ Login failed",
      description: errMsg,
      variant:     "destructive",
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
              {/* Email */}
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
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                    placeholder="you@example.com"
                    className="bg-background/50 border-white/10 pl-10"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
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

              {/* Inline error banner — shown for both validation and auth failures */}
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 gap-2" disabled={isLoading}>
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
