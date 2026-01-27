import { createScene } from "./scene";
import { mountUI } from "./ui";
import { mountArtworkDetail } from "./pages/ArtworkDetail";
import "./exhibition/exhibition.css";

function ensureRoot(): HTMLElement {
  const app = document.querySelector<HTMLElement>("#app");
  if (app) return app;

  const root = document.querySelector<HTMLElement>("#root");
  if (root) return root;

  const div = document.createElement("div");
  div.id = "app";
  document.body.appendChild(div);
  return div;
}

function ensureCanvas(root: HTMLElement): HTMLCanvasElement {
  let canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "canvas";
    root.appendChild(canvas);
  }

  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    outline: "none",
  });

  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  return canvas;
}

type Route = {
  path: string;
  render: (root: HTMLElement) => { unmount?: () => void };
};

const routes: Route[] = [
  {
    path: "/artwork",
    render: (root: HTMLElement) => {
      // 캔버스 숨기기
      const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
      if (canvas) canvas.style.display = "none";

      // UI 레이어 숨기기
      const uiLayer = document.querySelector<HTMLElement>(".ui-layer");
      if (uiLayer) uiLayer.style.display = "none";

      // 전시장 숨기기
      const exhRoot = document.querySelector<HTMLElement>(".exh-root");
      if (exhRoot) exhRoot.classList.remove("is-visible");

      return mountArtworkDetail(root);
    },
  },
];

let currentView: { unmount?: () => void } | null = null;
let sceneInitialized = false;

function matchRoute(pathname: string): Route | null {
  return routes.find((r) => pathname.startsWith(r.path)) ?? null;
}

function navigate() {
  const pathname = window.location.pathname;
  const route = matchRoute(pathname);

  // 이전 뷰 정리
  if (currentView?.unmount) {
    currentView.unmount();
    currentView = null;
  }

  const root = ensureRoot();

  if (route) {
    // 라우트 매칭 - 해당 뷰 렌더링
    currentView = route.render(root);
  } else {
    // 기본 뷰 - 씬 렌더링
    const canvas = ensureCanvas(root);
    canvas.style.display = "block";

    // UI 레이어 다시 표시
    const uiLayer = document.querySelector<HTMLElement>(".ui-layer");
    if (uiLayer) uiLayer.style.display = "block";

    // ✅ 전시장은 자동으로 표시하지 않음 (scene에서 제어)
    // const exhRoot = document.querySelector<HTMLElement>(".exh-root");
    // if (exhRoot) exhRoot.classList.add("is-visible");

    // 씬은 한 번만 초기화
    if (!sceneInitialized) {
      const ui = mountUI(root);
      createScene(canvas, ui);
      sceneInitialized = true;
    }
  }
}

function main() {
  // 초기 라우트 렌더링
  navigate();

  // 브라우저 뒤로가기/앞으로가기 처리
  window.addEventListener("popstate", navigate);
}

main();
// Vite + React Router 기준
// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import App from "./App";
// import ArtworkDetail from "./pages/ArtworkDetail";

// ReactDOM.createRoot(document.getElementById("app")!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <Routes>
//         <Route path="/*" element={<App />} />
//         <Route path="/artwork" element={<ArtworkDetail />} />
//       </Routes>
//     </BrowserRouter>
//   </React.StrictMode>
// );