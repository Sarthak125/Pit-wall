import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH lets the app live under a sub-path, e.g. "/pitwall/" on GitHub Pages.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: { host: true, port: 3030 },
  preview: { host: true, port: 3030 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Pit Wall: F1 Dashboard',
        short_name: 'Pit Wall',
        description: 'Live timing, FIA race control messages, standings and calendar.',
        theme_color: '#0F1215',
        background_color: '#0B0D10',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Standings and calendar: show the last saved copy when offline.
            urlPattern: ({ url }) => url.hostname === 'api.jolpi.ca',
            handler: 'NetworkFirst',
            options: { cacheName: 'jolpica', networkTimeoutSeconds: 8, expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            // Live data must be fresh, so it is never served from cache.
            urlPattern: ({ url }) => url.hostname === 'api.openf1.org',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
});
