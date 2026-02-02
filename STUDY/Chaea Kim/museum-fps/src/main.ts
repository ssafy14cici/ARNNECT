// src/main.ts
import "./style.css";
import "./intro/intro.css";

import { mountIntro, type CameraPose } from "./intro/mountIntro";
import { mountExitOverlay } from "./viewer/exitOverlay";
import { mountExhibitRoom } from "./viewer/exhibitRoom";

const canvas = document.createElement("canvas");
canvas.id = "canvas";
document.body.appendChild(canvas);

const POSE_KEY = "ARNNECT_EXTERIOR_POSE";
const SKIP_KEY = "ARNNECT_SKIP_LOADING";

let introRuntime: { dispose: () => void } | null = null;
let hallRuntime: { destroy: () => void } | null = null;
let exhibitRuntime: { destroy: () => void } | null = null;
let exitUiDispose: (() => void) | null = null;

const DEFAULT_HALL_START_WP = 0;

type ExhibitPayload = {
  artId?: number;
  artist: string;
  artworkTitle: string;
  fromWaypointId: number;
};

/** localStorage에서 외부 포즈 복원(있으면 1회 사용 후 삭제) */
function readSavedPose(): CameraPose | undefined {
  try {
    const raw = localStorage.getItem(POSE_KEY);
    if (!raw) return undefined;
    localStorage.removeItem(POSE_KEY);
    return JSON.parse(raw) as CameraPose;
  } catch {
    return undefined;
  }
}

/** localStorage에 외부 포즈 저장 */
function savePose(pose: CameraPose) {
  try {
    localStorage.setItem(POSE_KEY, JSON.stringify(pose));
  } catch {
    /* ignore */
  }
}

function toast(msg: string, ms = 1200) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);" +
    "z-index:999999;padding:10px 14px;border-radius:999px;" +
    "background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);" +
    "color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui;" +
    "font-size:13px;letter-spacing:0.02em;pointer-events:none;" +
    "box-shadow:0 10px 30px rgba(0,0,0,0.35);";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function cleanupInteriorRuntimes() {
  if (hallRuntime) {
    hallRuntime.destroy();
    hallRuntime = null;
  }
  if (exhibitRuntime) {
    exhibitRuntime.destroy();
    exhibitRuntime = null;
  }
}

function startIntro() {
  cleanupInteriorRuntimes();

  if (exitUiDispose) {
    exitUiDispose();
    exitUiDispose = null;
  }

  if (introRuntime) {
    introRuntime.dispose();
    introRuntime = null;
  }

  const restoredPose = readSavedPose();
  const skipLoading = !!sessionStorage.getItem(SKIP_KEY);
  sessionStorage.removeItem(SKIP_KEY);

  mountIntro(canvas, {
    glbUrl: `${import.meta.env.BASE_URL}models/museum/intro_2.glb`,
    prefetchUrl: `${import.meta.env.BASE_URL}models/museum/mh_add_5.glb`,

    doorName: "USA0_USA0_0",
    holdMs: 1000,
    framingScale: 1.0,
    topWhitespaceRatio: 0.42,

    hdriUrl: `${import.meta.env.BASE_URL}textures/rosendal_park_sunset_puresky_2k.hdr`,
    exposure: 0.55,
    envIntensity: 0.35,
    lightIntensity: 1.2,

    skipLoading,
    startPose: restoredPose,

    onReady: (pose) => savePose(pose),
    onEntered: () => startMainHall(DEFAULT_HALL_START_WP),
  }).then((rt) => {
    introRuntime = rt;
  });
}

async function startMainHall(startWaypointId: number) {
  // intro 정리
  if (introRuntime) {
    introRuntime.dispose();
    introRuntime = null;
  }
  // exhibit 정리
  if (exhibitRuntime) {
    exhibitRuntime.destroy();
    exhibitRuntime = null;
  }
  // hall 정리(있으면)
  if (hallRuntime) {
    hallRuntime.destroy();
    hallRuntime = null;
  }

  const { mountMainHallFree } = await import("./viewer/mainHallFree");

  hallRuntime = mountMainHallFree(canvas, {
    glbUrl: `${import.meta.env.BASE_URL}models/museum/mh_add_5.glb`,
    startWaypointId,
    onReady: () => {
      window.dispatchEvent(new Event("intro:clear-fade"));
      toast("HALL READY");
    },
    onOpenExhibit: (payload: ExhibitPayload) => {
      console.log("[main] onOpenExhibit payload:", payload);
      toast(`OPEN EXHIBIT: ${payload.artist}`);
      startExhibit(payload);
    },
  });

  // “외부로” Exit 버튼 유지
  if (!exitUiDispose) {
    exitUiDispose = mountExitOverlay({
      label: "Back to exterior",
      onExit: () => {
        sessionStorage.setItem(SKIP_KEY, "1");
        window.location.reload();
      },
    });
  }
}

async function startExhibit(payload: ExhibitPayload) {
  // hall 정리
  if (hallRuntime) {
    hallRuntime.destroy();
    hallRuntime = null;
  }
  // intro는 이미 없음(있으면 제거)
  if (introRuntime) {
    introRuntime.dispose();
    introRuntime = null;
  }
  // 기존 exhibit 정리
  if (exhibitRuntime) {
    exhibitRuntime.destroy();
    exhibitRuntime = null;
  }
  // exit overlay 숨기기 (exhibit에는 자체 back 버튼이 있음)
  if (exitUiDispose) {
    exitUiDispose();
    exitUiDispose = null;
  }

  console.log("[main] startExhibit()", payload);
  toast(`ENTER EXHIBIT: ${payload.artist}`);

  exhibitRuntime = await mountExhibitRoom(canvas, {
    glbUrl: `${import.meta.env.BASE_URL}models/gallery/gallery2.glb`,
    resetRootTransform: true,
    autoFitIfOff: true,
    debug: true, // ✅ 문제 해결되면 false
    titleText: `${payload.artist} — ${payload.artworkTitle}`,

    // ✅ 임시: public/art 이미지 → EX_PANEL 매핑 (나중에 백엔드 응답으로 교체)
    panelItems: Array.from({ length: 11 }, (_, i) => ({
      panelName: `EX_PANEL_${i + 1}`,
      imageUrl: `${import.meta.env.BASE_URL}art/b${i + 1}.jpg`,
      title: `작품 ${i + 1}`,
    })),

    onExitToHall: () => {
      toast("BACK TO HALL");
      startMainHall(payload.fromWaypointId ?? DEFAULT_HALL_START_WP);
    },
  });
}

/** 디버그: X키로 강제 전시장 진입 (버튼/모달이 안 먹는지 분리 테스트) */
window.addEventListener(
  "keydown",
  (e) => {
    if (e.code === "KeyX") {
      e.preventDefault();
      toast("DEBUG EXHIBIT");
      startExhibit({
        artist: "DEBUG",
        artworkTitle: "DEBUG",
        fromWaypointId: DEFAULT_HALL_START_WP,
      });
    }
  },
  { passive: false }
);

startIntro();