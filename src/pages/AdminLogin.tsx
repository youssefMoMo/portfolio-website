import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, LogIn, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseEnabled } from "@/lib/supabase";
import { loginWithDiscord, loginDev, isAuthenticatedSync } from "@/lib/auth";

// Dev credentials: VITE_DEV_ADMIN_ID + VITE_DEV_ADMIN_PASSWORD from .env
// Hard fallback when those are also missing: id=admin, password=admin123
const DEV_FALLBACK_ID  = "admin";
const DEV_FALLBACK_PWD = "admin123";

export default function AdminLogin() {
  const [, navigate]    = useLocation();
  const { toast }       = useToast();
  const [discordId, setDiscordId]         = useState("");
  const [password, setPassword]           = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);

  // Determine what dev credentials are actually configured
  const envId  = import.meta.env.VITE_DEV_ADMIN_ID  ?? "";
  const envPwd = import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? "";
  const hasEnvCreds = envId !== "" && envPwd !== "";

  useEffect(() => {
    if (isAuthenticatedSync()) navigate("/admin/dashboard");
  }, [navigate]);

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithDiscord();
    } catch {
      toast({ title: "❌ Error", description: "Failed to start Discord login", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleFallbackLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordId.trim() || !password) return;
    setIsLoading(true);

    // First try the env-based loginDev
    const result = await loginDev(discordId.trim(), password);

    if (result.success) {
      toast({ title: "✅ Success", description: "Welcome to Admin Panel!" });
      setTimeout(() => navigate("/admin/dashboard"), 400);
      setIsLoading(false);
      return;
    }

    // Hard fallback: when no env vars set, accept admin/admin123
    if (!hasEnvCreds) {
      if (discordId.trim() === DEV_FALLBACK_ID && password === DEV_FALLBACK_PWD) {
        sessionStorage.setItem("yd_dev_admin", "1");
        toast({ title: "✅ Dev Access", description: "Logged in with fallback credentials" });
        setTimeout(() => navigate("/admin/dashboard"), 400);
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: "❌ Login Failed",
      description: result.error ?? result.message ?? "Invalid credentials",
      variant: "destructive",
    });
    setIsLoading(false);
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
            <CardDescription>Secure login required</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isSupabaseEnabled ? (
              <>
                <Button
                  onClick={handleDiscordLogin}
                  disabled={isLoading}
                  className="w-full h-12 gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-base discord-glow"
                >
                  {isLoading
                    ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                    : <LogIn className="w-5 h-5" />}
                  {isLoading ? "Redirecting..." : "Login with Discord"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Only registered admin accounts can access the dashboard
                </p>
              </>
            ) : (
              <>
                {/* Dev mode notice */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Terminal className="w-4 h-4 shrink-0" />
                    Development Mode
                  </div>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    Supabase is not configured. Use the credentials below to log in.
                  </p>
                  {hasEnvCreds ? (
                    <div className="bg-black/30 rounded-lg p-3 text-xs font-mono text-amber-200/70 space-y-1">
                      <p>ID: <span className="text-amber-300">{envId}</span></p>
                      <p>Password: set in <span className="text-amber-300">VITE_DEV_ADMIN_PASSWORD</span></p>
                    </div>
                  ) : (
                    <div className="bg-black/30 rounded-lg p-3 text-xs font-mono text-amber-200/70 space-y-1">
                      <p>ID: <span className="text-amber-300">{DEV_FALLBACK_ID}</span></p>
                      <p>Password: <span className="text-amber-300">{DEV_FALLBACK_PWD}</span></p>
                      <p className="text-amber-400/50 pt-1 text-[10px]">
                        Set VITE_DEV_ADMIN_ID + VITE_DEV_ADMIN_PASSWORD in .env to use custom credentials
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleFallbackLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {hasEnvCreds ? "Discord ID" : "Username"}
                    </label>
                    <Input
                      type="text"
                      value={discordId}
                      onChange={(e) => setDiscordId(hasEnvCreds ? e.target.value.replace(/\D/g, "") : e.target.value)}
                      placeholder={hasEnvCreds ? "Your Discord ID" : DEV_FALLBACK_ID}
                      className="bg-background/50 border-white/10"
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={hasEnvCreds ? "" : DEV_FALLBACK_PWD}
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
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Authenticating..." : "Login"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
