import { createScene } from "./scene";
import { mountUI } from "./ui";

function ensureRoot(): HTMLElement {
  const app = document.querySelector<HTMLElement>("#app");
  if (app) return app;

  const root = document.querySelector<HTMLElement>("#root");
  if (root) return root;

  // 최후 폴백
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

  // 전체화면 캔버스
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    outline: "none",
  });

  // 페이지 기본 스타일(스크롤/여백 제거)
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  return canvas;
}

function main() {
  const root = ensureRoot();
  const canvas = ensureCanvas(root);

  const ui = mountUI(root);
  createScene(canvas, ui);
}

main();
