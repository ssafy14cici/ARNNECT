import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type Mode = "EXTERIOR" | "TRANSITION" | "INTERIOR";

export type SceneRuntime = {
  // three core
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;

  // groups
  exterior: THREE.Group;
  interior: THREE.Group;
  glbRoot: THREE.Group;

  // state flags
  mode: Mode;
  isAnimating: boolean;
  glbLoaded: boolean;

  // saved exterior cam state (for exit)
  exteriorState: {
    cam: THREE.Vector3;
    target: THREE.Vector3;
    exposure: number;
  };

  // entrance points (world, AFTER you did pick)
  doorPoint: THREE.Vector3;
  floorPoint: THREE.Vector3;
  entranceWorld: THREE.Vector3;

  // direction that represents "in front of the door" (XZ normalized)
  outwardDir: THREE.Vector3;

  // enter gating (we keep button visible always, but you may still want radius logic later)
  enterRadius: number;
  enterEnabled: boolean;

  // door pivots + closed angles
  leftDoorPivot: THREE.Object3D | null;
  rightDoorPivot: THREE.Object3D | null;
  leftDoorClosedY: number;
  rightDoorClosedY: number;

  // glow
  innerGlow: THREE.PointLight;

  // optional clamp hook installed by exterior.ts
  __exteriorClamp?: () => void;
};
