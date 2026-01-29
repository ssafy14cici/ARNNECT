import "./style.css";
import { mountMainHallFree } from "./viewer/mainHallFree";

function ensureCanvas(): HTMLCanvasElement {
  let canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "canvas";
    document.body.appendChild(canvas);
  }
  return canvas;
}

const canvas = ensureCanvas();

mountMainHallFree(canvas, {
  glbUrl: `${import.meta.env.BASE_URL}models/main_hall1.glb`,
});
