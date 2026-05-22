import { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { supabase } from "./lib/supabase";

// ─── Pages ────────────────────────────────────────────────────────────────────
import HomePage from "./pages/HomePage";
import PortfolioPage from "./pages/PortfolioPage";
import GamesPage from "./pages/GamesPage";
import PricingPage from "./pages/PricingPage";
import ReviewsPage from "./pages/ReviewsPage";
import PoliciesPage from "./pages/PoliciesPage";

// ─── Native UUID ───────────────────────────────────────────────────────────────
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateSessionToken(): string {
  try {
    let token = localStorage.getItem("session_token");
    if (!token) {
      token = generateUUID();
      localStorage.setItem("session_token", token);
    }
    return token;
  } catch {
    return generateUUID();
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AlertState {
  id: string;
  message: string;
}

interface BanState {
  reason: string;
}

// ─── ALERT BANNER ──────────────────────────────────────────────────────────────
function AlertBanner({
  alert,
  onDismiss,
}: {
  alert: AlertState;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{ zIndex: 99999, position: "fixed", top: 0, left: 0, width: "100%" }}
    >
      <div className="w-full bg-yellow-400 text-black flex items-center justify-between px-4 py-3 shadow-2xl border-b-4 border-yellow-600">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
          </span>
          <p className="font-bold text-sm sm:text-base truncate">{alert.message}</p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="ml-4 shrink-0 text-black/70 hover:text-black transition-colors text-xl leading-none font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── BAN OVERLAY ───────────────────────────────────────────────────────────────
function BanOverlay({ reason }: { reason: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      style={{
        zIndex: 999999,
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      tabIndex={-1}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-lg">
        <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
          You Have Been Banned
        </h1>
        {reason && reason.trim() !== "" ? (
          <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 w-full">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Reason</p>
            <p className="text-white text-base font-medium">{reason}</p>
          </div>
        ) : (
          <p className="text-white/50 text-sm">No reason was provided.</p>
        )}
        <p className="text-white/30 text-xs">
          If you believe this is a mistake, contact support via Discord.
        </p>
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [sessionToken] = useState<string>(getOrCreateSessionToken);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [ban, setBan] = useState<BanState | null>(null);

  // ── Register / heartbeat session ───────────────────────────────────────────
  useEffect(() => {
    const register = async () => {
      try {
        const { data: existing } = await supabase
          .from("sessions")
          .select("id")
          .eq("token", sessionToken)
          .maybeSingle();

        if (!existing) {
          await supabase.from("sessions").insert({
            token: sessionToken,
            page: window.location.pathname,
            last_seen: new Date().toISOString(),
          });
        } else {
          await supabase
            .from("sessions")
            .update({
              page: window.location.pathname,
              last_seen: new Date().toISOString(),
            })
            .eq("token", sessionToken);
        }
      } catch {
        // non-critical
      }
    };

    register();

    const interval = setInterval(async () => {
      try {
        await supabase
          .from("sessions")
          .update({
            page: window.location.pathname,
            last_seen: new Date().toISOString(),
          })
          .eq("token", sessionToken);
      } catch {
        // non-critical
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [sessionToken]);

  // ── Check existing ban on mount ────────────────────────────────────────────
  useEffect(() => {
    const checkBan = async () => {
      try {
        const { data } = await supabase
          .from("sessions")
          .select("is_banned, ban_reason")
          .eq("token", sessionToken)
          .maybeSingle();

        if (data?.is_banned) {
          setBan({ reason: data.ban_reason ?? "" });
        }
      } catch {
        // non-critical
      }
    };

    checkBan();
  }, [sessionToken]);

  // ── Check active alert on mount ────────────────────────────────────────────
  useEffect(() => {
    const checkAlert = async () => {
      try {
        const { data } = await supabase
          .from("site_alerts")
          .select("id, message")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.message) {
          setAlert({ id: data.id, message: data.message });
        }
      } catch {
        // non-critical
      }
    };

    checkAlert();
  }, []);

  // ── Real-time: ban/unban for this session ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionToken}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `token=eq.${sessionToken}`,
        },
        (payload) => {
          const row = payload.new as { is_banned?: boolean; ban_reason?: string };
          if (row.is_banned === true) {
            setBan({ reason: row.ban_reason ?? "" });
          } else if (row.is_banned === false) {
            setBan(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionToken]);

  // ── Real-time: global site alerts ─────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("global:alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_alerts",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setAlert((prev) =>
              prev?.id === (payload.old as { id: string }).id ? null : prev
            );
            return;
          }
          const row = payload.new as { id: string; message: string; active: boolean };
          if (row.active && row.message) {
            setAlert({ id: row.id, message: row.message });
          } else {
            setAlert((prev) => (prev?.id === row.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissAlert = useCallback(() => setAlert(null), []);

  return (
    <>
      {ban !== null && <BanOverlay reason={ban.reason} />}

      {!ban && alert !== null && (
        <AlertBanner alert={alert} onDismiss={dismissAlert} />
      )}

      <Router>
        <div className={!ban && alert ? "pt-12" : ""}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
          </Routes>
        </div>
      </Router>
    </>
  );
}
