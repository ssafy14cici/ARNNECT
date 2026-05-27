import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

function mockApiPlugin(useMock: boolean): Plugin {
  return {
    name: "arnnect-mock-api",
    configureServer(server) {
      if (!useMock) return;

      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== "/api/v1/artworks/feed") {
          next();
          return;
        }

        const data = Array.from({ length: 6 }, (_, idx) => {
          const imageUrl = `/demo-artworks/artwork-${String(idx + 1).padStart(2, "0")}.jpg`;
          return {
            artworkId: 9001 + idx,
            id: 9001 + idx,
            title: `Demo Artwork ${idx + 1}`,
            imageUrl,
            thumbnailUrl: imageUrl,
            artistName: "ARNNECT Demo",
            nickname: "ARNNECT Demo",
            memberUuid: "demo-artist",
            createdAt: new Date(Date.UTC(2026, 0, idx + 1)).toISOString(),
            likes: 0,
            views: 0,
          };
        });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ data }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMock = String(env.VITE_USE_MOCK).toLowerCase() === "true";

  return {
    plugins: [
      react(),
      mockApiPlugin(useMock),
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

    // Mock mode is for frontend-only portfolio demos, so dev must not proxy to backend.
    server: useMock
      ? undefined
      : {
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
  };
});
