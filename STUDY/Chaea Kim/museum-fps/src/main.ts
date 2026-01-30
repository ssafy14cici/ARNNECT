import "./style.css";
import { mountMainHallFree } from "./viewer/mainHallFree";

const canvas = document.createElement("canvas");
canvas.id = "canvas";
document.body.appendChild(canvas);

mountMainHallFree(canvas, {
  glbUrl: `${import.meta.env.BASE_URL}models/main_hall0.glb`,
  spawnPanelName: "panel1",
  offsetMeters: 2.0,
});
