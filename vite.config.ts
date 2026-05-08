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
        },
      },
    },
    server: {
      port: 5173,
    },
  };
});
