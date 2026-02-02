// src/museum/app/mountMuseumApp.ts
import "../styles/style.css";
import "../styles/intro.css";

import { mountIntro, type CameraPose } from "../intro/mountIntro";
import { mountExitOverlay } from "../viewer/exitOverlay";
import { mountExhibitRoom } from "../viewer/exhibitRoom";

const POSE_KEY = "ARNNECT_EXTERIOR_POSE";
const SKIP_KEY = "ARNNECT_SKIP_LOADING";
const DEFAULT_HALL_START_WP = 0;

export type ExhibitPayload = {
  artId?: number;
  artist: string;
  artworkTitle: string;
  fromWaypointId: number;
};

type IntroRuntime = { dispose: () => void };
type HallRuntime = { destroy: () => void };
type ExhibitRuntime = { destroy: () => void };

function asset(path: string) {
  // path 예: "museum/models/museum/intro_2.glb"
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

function toast(msg: string, ms = 1200, uiMount: HTMLElement = document.body) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);" +
    "z-index:999999;padding:10px 14px;border-radius:999px;" +
    "background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);" +
    "color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui;" +
    "font-size:13px;letter-spacing:0.02em;pointer-events:none;" +
    "box-shadow:0 10px 30px rgba(0,0,0,0.35);";
  el.textContent = msg;
  uiMount.appendChild(el);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

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

function savePose(pose: CameraPose) {
  try {
    localStorage.setItem(POSE_KEY, JSON.stringify(pose));
  } catch {
    /* ignore */
  }
}

export function mountMuseumApp(args: {
  canvas: HTMLCanvasElement;
  uiRoot?: HTMLElement;
  onExitToExterior?: () => void; // 나중에 Home으로 돌아가기 연결할 자리
}) {
  const canvas = args.canvas;
  const uiRoot = args.uiRoot ?? document.body;

  // ✅ 3D UI 전용 레이어
  const uiLayer = document.createElement("div");
  uiLayer.id = "museum-ui-layer";
  uiLayer.dataset.museumUiLayer = "1";
  uiLayer.style.cssText =
    "position:absolute;inset:0;z-index:9990;pointer-events:none;"; // 기본은 클릭 막지 않게
  uiRoot.appendChild(uiLayer);

  // 이후부터 uiMount는 uiLayer로 통일
  const uiMount = uiLayer;

  let disposed = false;

  let introRuntime: IntroRuntime | null = null;
  let hallRuntime: HallRuntime | null = null;
  let exhibitRuntime: ExhibitRuntime | null = null;
  let exitUiDispose: (() => void) | null = null;

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

  function cleanupAll() {
    if (introRuntime) {
      introRuntime.dispose();
      introRuntime = null;
    }
    cleanupInteriorRuntimes();
    if (exitUiDispose) {
      exitUiDispose();
      exitUiDispose = null;
    }
  }

  function startIntro() {
    if (disposed) return;

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
      uiMount,
      // ✅ "/museum/models/..." 통일 (기존: models/museum/...)
      glbUrl: asset("museum/models/museum/intro_2.glb"),
      prefetchUrl: asset("museum/models/museum/mh_add_5.glb"),

      doorName: "USA0_USA0_0",
      holdMs: 1000,
      framingScale: 1.0,
      topWhitespaceRatio: 0.42,

      // ✅ textures도 /museum 아래로
      hdriUrl: asset("museum/textures/rosendal_park_sunset_puresky_2k.hdr"),
      exposure: 0.55,
      envIntensity: 0.35,
      lightIntensity: 1.2,

      skipLoading,
      startPose: restoredPose,

      onReady: (pose) => savePose(pose),
      onEntered: () => startMainHall(DEFAULT_HALL_START_WP),
    })
      .then((rt) => {
        if (disposed) {
          rt.dispose();
          return;
        }
        introRuntime = rt;
      })
      .catch((e) => {
        console.error("[museum] startIntro failed:", e);
        toast("INTRO FAILED");
      });
  }


  async function startMainHall(startWaypointId: number) {
    if (disposed) return;

    // ✅ intro/hall/exhibit 런타임 정리 (중복/누수 방지)
    if (introRuntime) {
      introRuntime.dispose();
      introRuntime = null;
    }
    if (exhibitRuntime) {
      exhibitRuntime.destroy();
      exhibitRuntime = null;
    }
    if (hallRuntime) {
      hallRuntime.destroy();
      hallRuntime = null;
    }

    try {
      const { mountMainHallFree } = await import("../viewer/mainHallFree");
      if (disposed) return;

      const rt = mountMainHallFree(canvas, {
        glbUrl: asset("museum/models/museum/mh_add_5.glb"),
        startWaypointId,
        uiMount, // ✅ 여기!
        onReady: () => {
          window.dispatchEvent(new Event("intro:clear-fade"));
          toast("HALL READY");
        },
        onOpenExhibit: (payload) => {
          console.log("[APP] onOpenExhibit fired", payload);
          toast(`OPEN EXHIBIT: ${payload.artist}`);
          startExhibit(payload);
        },
      });

      // disposed가 import 이후에 true가 될 수도 있어서 한 번 더 안전장치
      if (disposed) {
        rt.destroy();
        return;
      }

      hallRuntime = rt;

      // ✅ 홀에 들어왔을 때만 “밖으로 나가기” 오버레이 생성
      if (!exitUiDispose) {
        exitUiDispose = mountExitOverlay({
          label: "Back to exterior",
          onExit: () => {
            sessionStorage.setItem(SKIP_KEY, "1");
            if (args.onExitToExterior) args.onExitToExterior();
            else window.location.reload();
          },
          uiMount, // ✅ 여기!
        });
      }
    } catch (e) {
      console.error("[museum] startMainHall failed:", e);
      toast("HALL FAILED (콘솔 확인)");
      // 필요하면 복구
      // startIntro();
    }
  }



  async function startExhibit(payload: ExhibitPayload) {
    if (disposed) return;

    if (hallRuntime) {
      hallRuntime.destroy();
      hallRuntime = null;
    }
    if (introRuntime) {
      introRuntime.dispose();
      introRuntime = null;
    }
    if (exhibitRuntime) {
      exhibitRuntime.destroy();
      exhibitRuntime = null;
    }
    if (exitUiDispose) {
      exitUiDispose();
      exitUiDispose = null;
    }

    console.log("[museum] startExhibit()", payload);
    toast(`ENTER EXHIBIT: ${payload.artist}`);

    exhibitRuntime = await mountExhibitRoom(canvas, {
      glbUrl: asset("museum/models/gallery/gallery2.glb"),
      resetRootTransform: true,
      uiMount, // ✅ 여기!
      autoFitIfOff: true,
      debug: true,
      titleText: `${payload.artist} — ${payload.artworkTitle}`,

      // ✅ art도 /museum 아래로 (assets 위치도 같이 옮겨야 함)
      panelItems: Array.from({ length: 11 }, (_, i) => ({
        panelName: `EX_PANEL_${i + 1}`,
        imageUrl: asset(`art/a${i + 1}.jpg`), // ✅ BASE_URL 안전
        // imageUrl: `${import.meta.env.BASE_URL}art/a${i + 1}.jpg`,
        title: `작품 ${i + 1}`,
      })),

      onExitToHall: () => {
        toast("BACK TO HALL");
        startMainHall(payload.fromWaypointId ?? DEFAULT_HALL_START_WP);
      },
    });
  }

  // 디버그: X키로 강제 전시장 진입
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyX") {
      e.preventDefault();
      toast("DEBUG EXHIBIT");
      startExhibit({
        artist: "DEBUG",
        artworkTitle: "DEBUG",
        fromWaypointId: DEFAULT_HALL_START_WP,
      });
    }
  };
  window.addEventListener("keydown", onKeyDown, { passive: false });

  // ✅ 시작
  startIntro();

  return {
    dispose() {
      disposed = true;
      window.removeEventListener("keydown", onKeyDown);
      cleanupAll();
      uiLayer.remove();
    },
  };
}
