import { defineConfig } from 'vite';
import { resolve } from 'path';

// Vite spike config for XE KHO POS
// Strategy: serve existing IIFE/CJS files as static assets
// NOT using ES module bundling yet — just dev server + future build
export default defineConfig({
  root: '.',
  publicDir: false, // don't copy public/ — we serve from root

  server: {
    port: 3000,
    open: false,
    // Serve Firebase config and data files
    fs: {
      allow: ['.'],
    },
  },

  build: {
    outDir: 'dist',
    // Don't minify — keep POS debugging easy
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      // Don't bundle — keep script tags as-is for now
      output: {
        manualChunks: undefined,
      },
    },
  },

  // Resolve bare imports for future ES module migration
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'app'),
      '@utils': resolve(__dirname, 'app/utils'),
    },
  },
});
