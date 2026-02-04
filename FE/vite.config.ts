// vite.config.ts
// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, 'src'),
//     },
//   },
// });


// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // 개발 중에도 SW를 켜서 테스트하고 싶으면 true (권장: 처음엔 true로 확인)
      // 실제 운영에서 불필요하면 false로
      devOptions: { enabled: true },

      // 첫 로드에서 SW 등록/활성화 전략
      registerType: 'autoUpdate',

      workbox: {
        // GLB 같은 큰 파일 캐시 허용 (기본값은 작아서 60MB 캐시가 안 됨)
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100MB

        runtimeCaching: [
          {
            // .glb 파일만 잡아서 캐시
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'glb-cache',

              // 캐시 정책 (너무 무한정 쌓이지 않게)
              expiration: {
                maxEntries: 20,                 // GLB 최대 20개
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30일
              },

              // 캐시가 없을 때 네트워크 실패해도 오래 기다리지 않게
              networkTimeoutSeconds: 10,

              // 200 응답만 캐시 (opaque도 캐시하려면 0 추가 가능)
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },

      // 최소 manifest (PWA 경고 줄이기)
      manifest: {
        name: 'Museum',
        short_name: 'Museum',
        start_url: '/',
        display: 'standalone',
        icons: [
          // 아이콘 없으면 일단 주석처리해도 됨
          // { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          // { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
