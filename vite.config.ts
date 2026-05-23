import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// vite.config.ts — production-ready with optional debug sourcemaps.
//
// To deploy with sourcemaps for debugging:
//   1. In Vercel project settings -> Environment Variables, add:
//        VITE_DEBUG_SOURCEMAPS = true
//   2. Trigger a redeploy.
//   3. Open DevTools on the live site -> minified errors will resolve to original source.
//   4. Remove the env var afterwards.

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
      sourcemap: debug ? true : false,
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
