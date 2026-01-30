// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router/routes";
import "./styles/global.css";
import { useAuthStore } from "./features/auth/store";

if (import.meta.env.DEV) {
  (window as any).__auth = useAuthStore; // 콘솔에서 __auth.getState() 가능
}


import { seedMockDB } from "./mocks"; // ✅
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
if (USE_MOCK) seedMockDB();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
