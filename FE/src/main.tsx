// FE/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles/global.css";

// ✅ 추가
import { seedMockAccounts } from "./mocks/authMock";

// ✅ 백엔드 미연결 기간엔 기본 true 유지 추천
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH !== "false";
if (USE_MOCK) seedMockAccounts();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
