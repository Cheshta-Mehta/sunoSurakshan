import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// SunoSuraksha — privacy-first, offline-capable sound awareness.
// Model assets are bundled locally; no CDN fetches at inference time.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      workbox: {
        // Cache the app shell and static assets for offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,wasm,tflite,csv}'],
        // Model + WASM assets are large; raise the cache cap so they
        // can be precached when bundled in /public.
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
      },
      manifest: {
        name: 'SunoSuraksha — Sound Awareness',
        short_name: 'SunoSuraksha',
        description:
          'Privacy-first, offline-capable sound awareness for deaf and hard-of-hearing people. Audio classification runs locally in your browser.',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react', '@mediapipe/tasks-audio'],
  },
});
