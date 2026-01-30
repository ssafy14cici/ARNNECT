// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router/routes";
import "./styles/global.css";
import { useAuthStore } from "./features/auth/store";

import { seedMockDB } from "./mocks";
import { useMock, setUseMock } from "./mocks/useMock.ts";

console.log("🔥🔥🔥 VERSION 3.0 - NETWORK REMOVED 🔥🔥🔥");

if (useMock()) seedMockDB();

if (import.meta.env.DEV) {
  (window as any).__auth = useAuthStore;
  (window as any).__mock = { useMock, setUseMock }; // 콘솔에서 토글 가능
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
