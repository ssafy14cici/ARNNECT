import "./style.css";
import { mountUI } from "./ui";
import { createScene } from "./scene";

// canvas
const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) {
  throw new Error("Canvas (#canvas) not found");
}

// ui root
const uiRoot = document.querySelector<HTMLElement>("#ui");
if (!uiRoot) {
  throw new Error("UI root (#ui) not found");
}

// mount ui
const ui = mountUI(uiRoot);

// start scene
createScene(canvas, ui);
