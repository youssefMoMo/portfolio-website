// src/pages/admin/PricingTab.tsx
//
// ─── PERFORMANCE OVERHAUL CHANGELOG ──────────────────────────────────────────
//
// DIRECTIVE 2 — Admin Code Splitting
//
//   This file is the lazy-loaded Pricing admin tab.
//
//   PricingEditor (src/pages/admin/PricingEditor.tsx) already contains all
//   the self-contained Supabase fetch/save/state logic for pricing plans.
//   This module provides:
//     a) The motion.div animation wrapper that the AdminDashboard AnimatePresence
//        expects — giving the tab the same enter/exit slide animation as all
//        other tabs.
//     b) A default export that React.lazy() can import as a chunk.
//
//   Bundle impact:
//     The PricingEditor is ~18 KB (pre-gzip). Together with this thin wrapper
//     it forms the "page-admin-pricing.js" chunk — downloaded only when the
//     user first clicks the Pricing tab. Removed from the initial AdminDashboard
//     bundle entirely.

import { motion } from "framer-motion";
import PricingEditor from "./PricingEditor";

export default function PricingTab() {
  return (
    <motion.div
      key="pricing"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
    >
      <PricingEditor />
    </motion.div>
  );
}
