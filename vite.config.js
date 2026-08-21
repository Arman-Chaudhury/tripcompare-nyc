import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/maskable.svg'],
      manifest: {
        name: 'TripCompare NYC',
        short_name: 'TripCompare',
        description: 'Every way from JFK, LGA, and EWR into the city — ranked by cost and time, with verified fares.',
        theme_color: '#0b5fff',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        lang: 'en',
        categories: ['travel', 'navigation', 'utilities'],
        icons: [
          { src: `${BASE}icons/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: `${BASE}icons/maskable.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: `${BASE}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Fare data is bundled into the JS, so precaching the app shell makes
        // every fare available offline. Alerts are network-first with a fallback.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            // Map tiles: cache-first so a trip you looked at still renders offline.
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'osm-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'router.project-osrm.org',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'osrm-routes', expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'geosearch.planninglabs.nyc' || url.hostname === 'nominatim.openstreetmap.org',
            handler: 'NetworkFirst',
            options: { cacheName: 'geocode', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/api/mta/') || url.hostname === 'api-endpoint.mta.info',
            handler: 'NetworkFirst',
            options: { cacheName: 'mta-alerts', networkTimeoutSeconds: 6, expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/mta': {
        target: 'https://api-endpoint.mta.info',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/mta\//, '/Dataservice/mtagtfsfeeds/camsys%2F'),
      },
    },
  },
});
