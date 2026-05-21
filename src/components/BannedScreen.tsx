// src/components/BannedScreen.tsx
// Rendered by App.tsx when the current browser session has is_banned=true.
// Covers the entire viewport with no escape route.

import { motion } from "framer-motion";
import { ShieldX, Lock } from "lucide-react";

interface BannedScreenProps {
  sessionToken?: string;
}

export function BannedScreen({ sessionToken }: BannedScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none"
    >
      {/* Animated red pulse rings */}
      <div className="relative flex items-center justify-center mb-10">
        <motion.div
          className="absolute w-48 h-48 rounded-full border border-red-500/20"
          animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute w-48 h-48 rounded-full border border-red-500/30"
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
        />
        <div className="w-28 h-28 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center backdrop-blur-sm">
          <ShieldX className="w-14 h-14 text-red-500" strokeWidth={1.5} />
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
        <Lock className="w-3.5 h-3.5 text-red-400" />
        <span className="text-red-400 text-xs font-mono font-semibold tracking-widest uppercase">
          Session Terminated
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 text-center px-6">
        Access Permanently Denied
      </h1>
      <p className="text-zinc-500 text-sm text-center max-w-sm px-6 leading-relaxed">
        Your session has been flagged and terminated due to repeated policy
        violations or unauthorized access attempts.
      </p>

      {sessionToken && (
        <p className="mt-8 text-zinc-700 text-xs font-mono text-center px-6">
          Session ID: {sessionToken.slice(0, 8)}…{sessionToken.slice(-8)}
        </p>
      )}

      <p className="mt-2 text-zinc-800 text-xs text-center px-6">
        Contact the site owner if you believe this is an error.
      </p>
    </motion.div>
  );
}
