// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/router/routes";
import "./styles/global.css";

import { useAuthStore } from "./features/auth/store";
import { seedMockDB } from "./mocks";
import { USE_MOCK } from "./shared/config/env";

// ✅ DEV에서만 디버깅 편의
if (import.meta.env.DEV) {
  (window as any).__auth = useAuthStore;
}

// ✅ 목업 모드 + DEV에서만 seed (중복 호출 제거)
if (import.meta.env.DEV && USE_MOCK) {
  seedMockDB();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
