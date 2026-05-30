import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Plugin: Supabase preconnect injector ─────────────────────────────────────
// Injects <link rel="preconnect"> for the Supabase origin into index.html at
// build time. No-ops silently if VITE_SUPABASE_URL is absent or malformed.
function supabasePreconnectPlugin(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'supabase-preconnect',
    transformIndexHtml(html: string): string {
      let origin = '';
      if (supabaseUrl) {
        try {
          origin = new URL(supabaseUrl).origin;
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const debug = env.VITE_DEBUG_SOURCEMAPS === 'true';

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

    base: '/',
    publicDir: 'public',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      target: 'es2020',

      // Hidden sourcemaps for server-side error tracking; off in standard prod
      sourcemap: debug ? 'hidden' : false,

      // Use esbuild (Vite's default) — reliable, fast, no CSS injection issues.
      // Terser's `mangle.toplevel: true` was mangling module-scope identifiers
      // and breaking the CSS injection pipeline in production builds.
      minify: 'esbuild',

      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',

          manualChunks(id: string): string | undefined {
            // React core — smallest, most stable, highest cache value
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/wouter/')
            ) return 'vendor-react';

            // Framer Motion — large, rarely changes
            if (id.includes('node_modules/framer-motion/'))
              return 'vendor-framer';

            // Supabase JS client
            if (id.includes('node_modules/@supabase/'))
              return 'vendor-supabase';

            // Lucide icons
            if (id.includes('node_modules/lucide-react/'))
              return 'vendor-icons';

            // Radix UI primitives
            if (id.includes('node_modules/@radix-ui/'))
              return 'vendor-radix';

            // TanStack Query
            if (id.includes('node_modules/@tanstack/'))
              return 'vendor-query';

            // Form library
            if (id.includes('node_modules/react-hook-form/'))
              return 'vendor-forms';

            // Misc small libs
            if (
              id.includes('node_modules/sonner/')     ||
              id.includes('node_modules/vaul/')       ||
              id.includes('node_modules/cmdk/')       ||
              id.includes('node_modules/next-themes/')||
              id.includes('node_modules/clsx/')       ||
              id.includes('node_modules/tailwind-merge/') ||
              id.includes('node_modules/class-variance-authority/')
            ) return 'vendor-misc';

            return undefined;
          },
        },
      },
    },

    server: {
      port: 5173,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },

    optimizeDeps: {
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
