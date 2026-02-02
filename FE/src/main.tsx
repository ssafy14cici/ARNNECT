// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/router/routes";
import "./styles/global.css";

import { useAuthStore } from "./features/auth/store";
import { seedMockDB } from "./mocks";

// ✅ 기본값: 목업 ON
// - VITE_USE_MOCK="false"로만 끌 수 있게 해두면, dev에서 실API 붙일 때만 OFF 하면 됨
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

if (import.meta.env.DEV) {
  // 콘솔에서 __auth.getState() 확인용
  (window as any).__auth = useAuthStore;
}

// ✅ 목업 모드일 때만 seed
if (USE_MOCK) {
  seedMockDB();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
