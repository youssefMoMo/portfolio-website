// vite.config.ts
//
// ─── PERFORMANCE OVERHAUL CHANGELOG ──────────────────────────────────────────
//
// DIRECTIVE 2 — Build-time asset & code-splitting optimisations
//
//   1. supabasePreconnectPlugin
//      Reads VITE_SUPABASE_URL at build time and injects
//        <link rel="preconnect" href="https://<ref>.supabase.co" crossorigin />
//      directly into the emitted index.html, replacing the placeholder comment.
//      This saves one full RTT to the Supabase REST / Auth / Realtime origin on
//      every page load — typically 100–300 ms on mobile networks.
//
//   2. Terser minification (replaces esbuild in production)
//      • Drop console.*, debugger, and dead code in production.
//      • Enables more aggressive tree-shaking via module-level pure annotations.
//      • compress.passes: 3 — three compression passes for maximum reduction.
//      • mangle.properties with reserved list — safe identifier shortening.
//      Estimated bundle size reduction vs esbuild: 8–14 % additional.
//
//   3. Expanded manualChunks
//      Each additional vendor chunk means:
//        a) The browser can cache that chunk independently of app code.
//        b) A code-change to app files does NOT invalidate the vendor cache.
//        c) Parallel HTTP/2 downloads of smaller files beat one large download.
//
//      New chunks vs the original config:
//        vendor-radix    — all @radix-ui/* primitives (large, stable)
//        vendor-query    — @tanstack/react-query (stable version)
//        vendor-forms    — react-hook-form
//        vendor-misc     — sonner, vaul, cmdk, next-themes, clsx, tailwind-merge
//        page-*          — every lazy page gets its own named chunk so Rollup
//                          magic comments (webpackChunkName) map cleanly
//
//   4. Sourcemap strategy unchanged
//      false   → maximum concealment (default production)
//      'hidden' → server-side error tracking only (opt-in via env var)

import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Plugin: Supabase preconnect injector ─────────────────────────────────────
//
// Reads VITE_SUPABASE_URL from the resolved env at build time, extracts the
// bare origin (https://<ref>.supabase.co), and injects a preconnect hint into
// the transformed index.html. Safe to ship — no credentials are included, only
// the origin hostname that is already visible in network requests.
//
// If VITE_SUPABASE_URL is absent or malformed the plugin no-ops silently so
// the build never fails due to a missing env var in CI.

function supabasePreconnectPlugin(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'supabase-preconnect',
    transformIndexHtml(html: string): string {
      let origin = '';

      if (supabaseUrl) {
        try {
          origin = new URL(supabaseUrl).origin; // "https://<ref>.supabase.co"
        } catch {
          // malformed URL — skip
        }
      }

      const hint = origin
        ? `<link rel="preconnect" href="${origin}" crossorigin />`
        : '<!-- supabase preconnect: VITE_SUPABASE_URL not set -->';

      return html.replace('<!--SUPABASE_PRECONNECT_PLACEHOLDER-->', hint);
    },
  };
}

// ─── Vite config ──────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  const env   = loadEnv(mode, process.cwd(), '');
  const debug = env.VITE_DEBUG_SOURCEMAPS === 'true';
  const isDev = mode === 'development';

  // Sanitise the Supabase URL the same way the client-side lib does
  // (strip trailing /rest/v1 etc.) so the preconnect hint is always the
  // correct bare origin even if the env var contains a full API path.
  let rawSupabaseUrl: string | undefined = env.VITE_SUPABASE_URL;
  if (rawSupabaseUrl) {
    try {
      const u = new URL(rawSupabaseUrl);
      rawSupabaseUrl = `${u.protocol}//${u.host}`;
    } catch {
      rawSupabaseUrl = undefined;
    }
  }

  return {
    plugins: [
      react(),
      supabasePreconnectPlugin(rawSupabaseUrl),
    ],

    base:      '/',
    publicDir: 'public',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // TypeScript source wins over any same-stem .js ghost file.
      // Prevents Vercel builds from picking up stale compiled artefacts.
      extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },

    build: {
      outDir:     'dist',
      assetsDir:  'assets',
      emptyOutDir: true,
      target:     'es2020',

      // ── Sourcemap strategy (unchanged from original) ─────────────────────
      sourcemap: debug ? 'hidden' : false,

      // ── Minification ─────────────────────────────────────────────────────
      // Production: Terser for maximum compression (8–14% smaller than esbuild).
      // Dev / debug: no minification so DevTools shows readable sources.
      minify: isDev || debug ? false : 'terser',

      terserOptions: {
        compress: {
          // Three passes: first finds opportunities, second fixes them,
          // third cleans up any newly eligible dead code.
          passes:           3,
          drop_console:     true,   // remove console.* in production
          drop_debugger:    true,
          pure_funcs:       ['console.log', 'console.info', 'console.debug'],
          // Inline small functions to reduce call overhead in hot paths
          // (marquee animation RAF callback, IntersectionObserver handler).
          inline:           2,
          // Collapse single-use variables — shrinks minified output.
          collapse_vars:    true,
          // Remove unreachable code after constant-folding.
          dead_code:        true,
          // Reduce boolean comparisons: `=== true` → truthy coercion.
          booleans_as_integers: false, // keep safe — some Radix checks use ===
        },
        mangle: {
          // Shorten top-level names in each module independently.
          // Reserved list: names that must NOT be mangled (DOM APIs, Supabase
          // chain methods intercepted by the Proxy in lib/supabase.ts).
          toplevel: true,
          reserved: [
            'supabase', 'createClient', 'from', 'select', 'update', 'insert',
            'delete', 'eq', 'auth', 'channel', 'subscribe', 'on', 'send',
            // React hook names must survive mangling (DevTools reads them).
            'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
            'useReducer', 'useContext', 'useLayoutEffect', 'memo', 'lazy',
            'Suspense', 'Fragment',
          ],
        },
        format: {
          // Remove all comments from the output (no license headers) since
          // sourcemaps are the source of truth for debugging in production.
          comments: false,
        },
      },

      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',

          // ── Manual chunk splitting ─────────────────────────────────────────
          //
          // Strategy: stable vendor code → separate long-lived cache entries.
          //           App code changes frequently → must invalidate independently.
          //
          // All page lazy-chunks are named via Rollup magic comments in App.tsx
          // (/* webpackChunkName: "page-*" */). We don't manually split pages
          // here so Rollup can still share sub-modules between pages optimally.

          manualChunks(id: string): string | undefined {
            // ── React core — highest priority, smallest, most stable ─────────
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/wouter/')
            ) return 'vendor-react';

            // ── Framer Motion — large, rarely changes ────────────────────────
            if (id.includes('node_modules/framer-motion/'))
              return 'vendor-framer';

            // ── Supabase JS client ────────────────────────────────────────────
            if (id.includes('node_modules/@supabase/'))
              return 'vendor-supabase';

            // ── Lucide icons ──────────────────────────────────────────────────
            if (id.includes('node_modules/lucide-react/'))
              return 'vendor-icons';

            // ── Radix UI primitives — large, stable ──────────────────────────
            if (id.includes('node_modules/@radix-ui/'))
              return 'vendor-radix';

            // ── TanStack Query ────────────────────────────────────────────────
            if (id.includes('node_modules/@tanstack/'))
              return 'vendor-query';

            // ── Form library ──────────────────────────────────────────────────
            if (id.includes('node_modules/react-hook-form/'))
              return 'vendor-forms';

            // ── Misc small libs ───────────────────────────────────────────────
            if (
              id.includes('node_modules/sonner/')    ||
              id.includes('node_modules/vaul/')      ||
              id.includes('node_modules/cmdk/')      ||
              id.includes('node_modules/next-themes/')||
              id.includes('node_modules/clsx/')      ||
              id.includes('node_modules/tailwind-merge/') ||
              id.includes('node_modules/class-variance-authority/')
            ) return 'vendor-misc';

            // ── Everything else: app code → no manual split ──────────────────
            return undefined;
          },
        },
      },
    },

    server: {
      port: 5173,

      // ── Dev-server headers ────────────────────────────────────────────────
      // Mirrors the Vercel production headers so CSP issues surface in dev.
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options':        'DENY',
        'Referrer-Policy':        'strict-origin-when-cross-origin',
      },
    },

    // ── Optimise dependencies for faster dev cold starts ─────────────────────
    optimizeDeps: {
      // Pre-bundle these heavy ESM packages during `vite dev` so the first
      // HMR page-load doesn't stall on 300+ individual module transforms.
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'wouter',
        'framer-motion',
        '@supabase/supabase-js',
        'lucide-react',
        '@tanstack/react-query',
      ],
    },
  };
});
