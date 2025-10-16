import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/\{s\}\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openstreetmap-tiles',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          }
        ],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'ZAPALERT!',
        short_name: 'ZAPALERT',
        description: 'Disaster Reporting & Response App for Zapatera',
        theme_color: '#dc2626', // Changed to red to match your emergency theme
        background_color: '#3b82f6', // Blue background
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        categories: ['navigation', 'social', 'utilities'],
        icons: [
          {
            src: '/icons/zapalert-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/zapalert-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/zapalert-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
      },
    }),
  ],
});