import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// vite.config.ts — production-ready with concealed sourcemaps.
//
// Sourcemap strategy:
//   • Normal production (default): sourcemap = false
//     Full sourcemap files are NOT generated at all. No .map files are
//     written to dist/, so client browser DevTools have nothing to load.
//     This is the safest mode for protecting proprietary infrastructure
//     routes and internal code annotations from reverse engineering.
//
//   • Debug mode (opt-in): sourcemap = 'hidden'
//     Full sourcemap files ARE generated and written to dist/, but the
//     browser-visible bundle files contain NO `//# sourceMappingURL=`
//     comment pointing at them. The maps are available to server-side
//     error-tracking tools (e.g. Sentry's artifact upload, Datadog RUM)
//     that are given the maps out-of-band, but remain invisible to anyone
//     inspecting the live site in DevTools.
//
// To enable debug mode for a single deploy:
//   1. In Vercel → Project Settings → Environment Variables, add:
//        VITE_DEBUG_SOURCEMAPS = true   (Preview or Production scope)
//   2. Trigger a redeploy.
//   3. Upload the generated .map files to your error-tracking service.
//   4. Delete the env var and redeploy again to return to production mode.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const debug = env.VITE_DEBUG_SOURCEMAPS === 'true';

  return {
    plugins: [react()],
    base: '/',
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Explicit extension resolution order — .ts/.tsx BEFORE .js/.jsx.
      //
      // Vite's default order is ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // which means a bare import like './imageFallback' resolves to the .js
      // variant when both imageFallback.js and imageFallback.ts exist in the same
      // directory. This caused Vercel builds to pick up the stale .js ghost and
      // fail with "'svgPlaceholder' is not exported by 'src/lib/imageFallback.js'".
      //
      // Placing .mts/.ts/.tsx first ensures TypeScript source always wins over any
      // same-stem .js file that might exist in the working tree or survive as a
      // build-cache artifact on the remote. This is defense-in-depth alongside the
      // git rm --cached purge and the .gitignore lock on the .js paths.
      extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // 'hidden'  → maps written to disk, NO sourceMappingURL comment in bundles.
      //             Safe for server-side error tracking; invisible in client DevTools.
      // false     → maps never written at all. Maximum concealment for production.
      sourcemap: debug ? 'hidden' : false,
      minify: debug ? false : 'esbuild',
      emptyOutDir: true,
      target: 'es2020',
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          manualChunks: {
            // Heavy UI libs that public pages use — keep separate from app code
            // so they cache across deploys when only app code changes.
            'vendor-framer':   ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-react':    ['react', 'react-dom', 'wouter'],
            'vendor-icons':    ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5173,
    },
  };
});
