// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false }, // 필요하면 true로

      workbox: {
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100MB

        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'glb-cache',
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
              },
              // ❌ networkTimeoutSeconds 제거 (NetworkFirst에서만 가능)
            },
          },
        ],
      },

      manifest: {
        name: 'Museum',
        short_name: 'Museum',
        start_url: '/',
        display: 'standalone',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
