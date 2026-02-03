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
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

function toast(msg: string, ms = 1200, mount: HTMLElement = document.body) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:50%;top:18px;transform:translateX(-50%);" +
    "z-index:999999;padding:10px 14px;border-radius:999px;" +
    "background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);" +
    "color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui;" +
    "font-size:13px;letter-spacing:0.02em;pointer-events:none;" +
    "box-shadow:0 10px 30px rgba(0,0,0,0.35);";
  el.textContent = msg;

  mount.appendChild(el); // ✅ 단 한 곳만
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
  onExitToExterior?: () => void;
}) {
  const canvas = args.canvas;
  const uiRoot = args.uiRoot ?? document.body;

  // ✅ 3D UI 전용 레이어 (항상 화면 기준으로 고정)
  const uiLayer = document.createElement("div");
  uiLayer.id = "museum-ui-layer";
  uiLayer.dataset.museumUiLayer = "1";
  uiLayer.style.cssText =
    "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
    "z-index:9990;pointer-events:none;";
  uiRoot.appendChild(uiLayer);

  // 이후부터 uiMount는 uiLayer로 통일
  const uiMount = uiLayer;

  // ✅ 여기로 고정해서 toast가 절대 body로 안 새게 함
  const toastHere = (msg: string, ms = 1200) => toast(msg, ms, uiMount);

  let disposed = false;

  let introRuntime: IntroRuntime | null = null;
  let hallRuntime: HallRuntime | null = null;
  let exhibitRuntime: ExhibitRuntime | null = null;
  let exitUiDispose: (() => void) | null = null;

  // function clearUiLayer() {
  //   // intro/hall/exhibit가 붙인 잔여 UI 싹 제거 (id나 dataset 기준)
  //   uiMount.querySelectorAll('[data-museum-ui="1"]').forEach((n) => n.remove());
  //   uiMount.querySelectorAll("#art-modal, #tutorial-overlay, #exhibit-art-modal, #panel-modal").forEach((n) => n.remove());
  // }

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
      glbUrl: asset("museum/models/museum/intro_2.glb"),
      prefetchUrl: asset("museum/models/museum/mh_add_5.glb"),

      doorName: "USA0_USA0_0",
      holdMs: 1000,
      framingScale: 1.0,
      topWhitespaceRatio: 0.42,

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
        toastHere("INTRO FAILED");
      });
  }

  async function startMainHall(startWaypointId: number) {
    if (disposed) return;

    // ✅ 중복/누수 방지
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
        uiMount,
        onReady: () => {
          window.dispatchEvent(new Event("intro:clear-fade"));
          toastHere("HALL READY");
        },
        onOpenExhibit: (payload) => {
          console.log("[APP] onOpenExhibit fired", payload);
          toastHere(`OPEN EXHIBIT: ${payload.artist}`);
          startExhibit(payload);
        },
      });

      if (disposed) {
        rt.destroy();
        return;
      }

      hallRuntime = rt;

      // ✅ 홀에서만 exit overlay
      if (!exitUiDispose) {
        exitUiDispose = mountExitOverlay({
          label: "Back to exterior",
          onExit: () => {
            console.log("[APP] Exit overlay clicked -> startIntro() (no reload)");
            sessionStorage.setItem(SKIP_KEY, "1");
            startIntro();
            // if (args.onExitToExterior) {
            //   args.onExitToExterior();   // 바깥 앱이 따로 exterior 라우팅/마운트 관리하면 이걸로
            // } else {
            //   startIntro();              // 기본은 intro로 돌아가기
            // }
          },
          uiMount,
        });
      }
    } catch (e) {
      console.error("[museum] startMainHall failed:", e);
      toastHere("HALL FAILED (콘솔 확인)");
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
    toastHere(`ENTER EXHIBIT: ${payload.artist}`);

    exhibitRuntime = await mountExhibitRoom(canvas, {
      glbUrl: asset("museum/models/gallery/gallery5.glb"),
      resetRootTransform: true,
      uiMount,
      autoFitIfOff: true,
      debug: true,
      titleText: `${payload.artist} — ${payload.artworkTitle}`,

      panelItems: Array.from({ length: 11 }, (_, i) => ({
        panelName: `EX_PANEL_${i + 1}`,
        imageUrl: asset(`art/a${i + 1}.jpg`),
        title: `작품 ${i + 1}`,
      })),

      onExitToHall: () => {
        toastHere("BACK TO HALL");
        startMainHall(payload.fromWaypointId ?? DEFAULT_HALL_START_WP);
      },
    });
  }

  // 디버그: X키로 강제 전시장 진입
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyX") {
      e.preventDefault();
      toastHere("DEBUG EXHIBIT");
      startExhibit({
        artist: "DEBUG",
        artworkTitle: "DEBUG",
        fromWaypointId: DEFAULT_HALL_START_WP,
      });
    }
  };
  window.addEventListener("keydown", onKeyDown, { passive: false });

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
