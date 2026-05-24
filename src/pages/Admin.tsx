// src/pages/Admin.tsx
//
// ── ARCHITECTURE NOTE ─────────────────────────────────────────────────────────
//
// This file exists solely as a routing shim. The router registers two paths:
//
//   /admin          → Admin          (this file)   → renders AdminLogin
//   /admin/login    → AdminLogin     (direct)      → renders AdminLogin
//
// Having both paths resolve to the same component means:
//   • Bookmarks to /admin land correctly.
//   • Redirects from /admin/dashboard (when unauthenticated) resolve cleanly.
//   • The routing surface stays minimal — no additional logic lives here.
//
// If the router is ever consolidated so that /admin routes directly to AdminLogin
// without this shim, this file can be safely deleted. Until then, keep it as a
// one-liner re-export to avoid orphaning the /admin route registration.
//
// ─────────────────────────────────────────────────────────────────────────────

import AdminLogin from "./AdminLogin";

export default function Admin() {
  return <AdminLogin />;
}
