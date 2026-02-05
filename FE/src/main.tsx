// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/global.css";

import { useAuthStore } from "./features/auth/store";

// ✅ DEV에서만 디버깅 편의
if (import.meta.env.DEV) {
  (window as any).__auth = useAuthStore;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
