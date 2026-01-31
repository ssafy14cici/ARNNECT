// src/main.ts
import "./style.css";
import "./intro/intro.css";

import { mountIntro, type CameraPose } from "./viewer/intro";
import { mountExitOverlay } from "./viewer/exitOverlay";

const canvas = document.createElement("canvas");
canvas.id = "canvas";
document.body.appendChild(canvas);

const POSE_KEY = "ARNNECT_EXTERIOR_POSE";
const SKIP_KEY = "ARNNECT_SKIP_LOADING";

let introRuntime: { dispose: () => void } | null = null;
let exitUiDispose: (() => void) | null = null;
let interiorRuntime: { destroy: () => void } | null = null;
let lastPose: CameraPose | undefined;

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

function startIntro() {
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
    glbUrl: `${import.meta.env.BASE_URL}models/intro.glb`,
    prefetchUrl: `${import.meta.env.BASE_URL}models/mh_add_5.glb`,

    // ✅ 스샷 기준 이름(0)
    doorName: "USA0_USA0_0",

    holdMs: 1000,

    // ✅ HDRI 배경
    hdriUrl: `${import.meta.env.BASE_URL}textures/rosendal_park_sunset_puresky_2k.hdr`,
    exposure: 0.55,       // 전체 밝기 (낮을수록 어둡게)
    envIntensity: 0.35,   // 건물 반사량 (낮을수록 원래 색 유지)
    lightIntensity: 1.2,  // 디렉셔널 라이트 (건물 자체 조명)

    // ✅ 내부에서 돌아올 때 로딩 건너뛰기
    skipLoading,

    // ✅ 내부에서 돌아오면 동일 시점 복원
    startPose: restoredPose,

    // ✅ Enter 되기 직전 포즈 저장(리로드 복귀용)
    onReady: (pose) => {
      savePose(pose);
    },

    onEntered: startInterior,
  }).then((rt) => {
    introRuntime = rt;
  });
}

async function startInterior() {
  // intro 정리
  if (introRuntime) {
    introRuntime.dispose();
    introRuntime = null;
  }

  // ✅ IMPORTANT:
  // 내부 모듈을 동적 import로 바꿔서 "인트로 화면에서도 내부 루프가 돌아가는" 문제를 차단
  const { mountMainHallFree } = await import("./viewer/mainHallFree");

  mountMainHallFree(canvas, {
    glbUrl: `${import.meta.env.BASE_URL}models/mh_add_5.glb`,
    onReady: () => {
      // Interior fully loaded — clear the intro white fade
      window.dispatchEvent(new Event("intro:clear-fade"));
    },
  });

  // ✅ 임시 Exit 버튼: 안전하게 리로드로 종료(내부 rAF/이벤트 잔존 방지)
  exitUiDispose = mountExitOverlay({
    label: "Back to exterior",
    onExit: () => {
      // 로딩 애니메이션 건너뛰기 플래그 설정
      sessionStorage.setItem(SKIP_KEY, "1");
      window.location.reload();
    },
  });
}

startIntro();
