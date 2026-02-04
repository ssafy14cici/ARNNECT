// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      workbox: {
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".glb"),
            handler: "CacheFirst",
            options: {
              cacheName: "glb-cache",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: { name: "Museum", short_name: "Museum", start_url: "/", display: "standalone" },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },

  // ✅ 추가
  server: {
    proxy: {
      "/api/v1": {
        target: "https://i14e107.p.ssafy.io:8001",
        changeOrigin: true,
        secure: false,
      },
      "/artwork": {
        target: "https://i14e107.p.ssafy.io:8001",
        changeOrigin: true,
        secure: false,
      },
      "/review": {
        target: "https://i14e107.p.ssafy.io:8001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
