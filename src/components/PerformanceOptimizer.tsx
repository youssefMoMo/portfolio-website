// src/components/PerformanceOptimizer.tsx
//
// ─── REFACTOR NOTES ─────────────────────────────────────────────────────────
//
//  STATE UNIFICATION (fragmented keys obliterated)
//    • The previous implementation maintained its own isolated localStorage
//      keys: `performance_optimizer_enabled` and `performance_optimizer_disabled`.
//      These were never read by SettingsModal or any other component, creating a
//      completely disconnected state island.
//    • All read/write is now exclusively through `usePerformanceSettings()` from
//      SettingsModal — specifically the `ecoMode` / `setEcoMode` pair, which
//      writes `yd_eco_mode` and fires the `yd-perf-settings-changed` event that
//      all marquees, DualMarqueeSection, and SettingsModal already listen to.
//    • Clicking "Enable Now" calls `setEcoMode(true)`. The toggle in SettingsModal
//      reflects the change immediately because both use the same hook.
//
//  .performance-mode CLASS REMOVED
//    • The old code injected `document.documentElement.classList.add("performance-mode")`
//      on enable. This class was never defined in globals.css or any stylesheet,
//      making it a dead write with no observable effect.
//    • `usePerformanceSettings.setEcoMode(true)` correctly adds the `eco-mode`
//      class to `<html>` instead — the class that CSS marquee pause rules and
//      conditional renders actually check.
//
//  NON-STANDARD API REMOVED
//    • `(navigator as any).deviceMemory` is a non-standard, Chromium-only API.
//      It requires a `any` cast in TypeScript and cannot be polyfilled.
//    • Progressive enhancement replacement: low-end detection now uses only the
//      W3C-standard `navigator.hardwareConcurrency` (supported in all modern
//      browsers) plus a conservative UA-based mobile check.
//
//  DEAD SUB-COMPONENT REMOVED
//    • `PerformanceSettings` was exported but never imported anywhere in the
//      codebase. It has been deleted entirely. The SettingsModal already renders
//      the canonical performance toggles via `usePerformanceSettings`.
//
//  BANNER LOGIC
//    • The banner surfaces only when: the device looks low-end AND `ecoMode` is
//      not already on (don't nag users who already enabled it).
//    • "Enable Now" → `setEcoMode(true)` → banner hides, all site-wide consumers
//      react through the shared event bus.
//    • "Maybe Later" → local `dismissed` flag set to true → banner hides for
//      the session. The user can always toggle from SettingsModal.
//    • The 2-second delay before the banner shows prevents it appearing during
//      initial page paint while other animations are still settling.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePerformanceSettings } from "@/components/SettingsModal";

// ─── Low-end device detection (standard APIs only) ───────────────────────────

function isLikelyLowEndDevice(): boolean {
  // navigator.hardwareConcurrency: number of logical CPU cores — W3C standard.
  // Falls back to 4 (assume adequate) when unavailable.
  const cores = typeof navigator !== "undefined"
    ? (navigator.hardwareConcurrency ?? 4)
    : 4;

  // Conservative UA check: phones and tablets tend to have fewer CPU/GPU
  // resources available per tab than desktop browsers.
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return cores < 4 || isMobile;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceOptimizer() {
  const { toast } = useToast();

  // Single source of truth for eco mode — shared with SettingsModal and all
  // marquee components via the yd-perf-settings-changed event bus.
  const { ecoMode, setEcoMode } = usePerformanceSettings();

  // showBanner: true only when the device looks weak AND the user hasn't
  //             already enabled eco mode AND hasn't dismissed this banner.
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed,  setDismissed]  = useState(false);

  useEffect(() => {
    // Delay the check to avoid competing with initial page-load animations.
    const timer = setTimeout(() => {
      if (!ecoMode && !dismissed && isLikelyLowEndDevice()) {
        setShowBanner(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
    // Only run once on mount — we don't want the banner to reappear if the user
    // manually disables eco mode after enabling it from SettingsModal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide banner automatically if eco mode is toggled on from SettingsModal
  // while the banner happens to be visible.
  useEffect(() => {
    if (ecoMode && showBanner) {
      setShowBanner(false);
    }
  }, [ecoMode, showBanner]);

  const handleEnable = () => {
    setShowBanner(false);
    // Unified write: sets yd_eco_mode="true", adds eco-mode class to <html>,
    // and fires yd-perf-settings-changed for all subscribers.
    setEcoMode(true);
    toast({
      title: "Low-End Device Mode Enabled",
      description:
        "Animations and marquees replaced with lightweight static layouts. " +
        "You can change this any time in Settings.",
    });
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    toast({
      title: "Performance Mode Skipped",
      description: "You can enable it from the Settings panel at any time.",
    });
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
        role="alertdialog"
        aria-labelledby="perf-banner-title"
        aria-describedby="perf-banner-desc"
      >
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-2xl shadow-red-900/50 p-6 relative overflow-hidden">

          {/* Subtle shimmer — keeps animation cost minimal */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
            }}
          />

          <div className="relative z-10">

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="perf-banner-title"
                    className="text-white font-bold text-base leading-tight"
                  >
                    Low-End Device Detected
                  </h3>
                  <p className="text-red-100 text-xs mt-0.5">
                    Optimise for smoother performance
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="text-white/80 hover:text-white hover:bg-white/20 flex-shrink-0 -mt-1 -mr-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Body */}
            <p
              id="perf-banner-desc"
              className="text-white/90 text-sm mb-4 leading-relaxed"
            >
              Your device may benefit from Low-End Device Mode — it replaces
              heavy animations and marquees with lightweight static layouts for
              a noticeably smoother experience.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleEnable}
                className="flex-1 bg-white text-red-600 hover:bg-red-50 font-semibold text-sm"
              >
                Enable Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10 text-sm"
              >
                Maybe Later
              </Button>
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
