// src/museum/app/mountMuseumApp.ts
import "../styles/style.css";
import "../styles/intro.css";
import { fetchNewArtists, buildNewArtistImageUrl } from "../../features/artworks/api/newArtists";
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

  mount.appendChild(el);
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

/** =========================
 * ✅ Recent Artwork API (/api/v1/artwork/new)
 * ========================= */
type RecentArtworkDto = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description: string;
  productionDate: string;
  savedImageName: string;
};

type JsonRecord = Record<string, unknown>;
function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = NaN): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseRecentArtworkList(raw: unknown): RecentArtworkDto[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentArtworkDto[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const artworkId = asNumber(item.artworkId, NaN);
    const savedImageName = asString(item.savedImageName, "");
    const title = asString(item.title, "");
    const nickname = asString(item.nickname, "");
    const memberUuid = asString(item.memberUuid, "");
    const description = asString(item.description, "");
    const productionDate = asString(item.productionDate, "");

    if (!Number.isFinite(artworkId)) continue;
    if (!savedImageName) continue;

    out.push({
      memberUuid,
      nickname,
      artworkId,
      title: title || "(untitled)",
      description,
      productionDate,
      savedImageName,
    });
  }
  return out;
}

/**
 * ✅ savedImageName -> 실제 이미지 URL로 변환
 * - 백엔드가 /artwork/{savedImageName} 로 서빙한다고 가정
 * - 만약 실제가 /api/v1/artwork/image/{name} 같은 형태면 여기만 수정
 */
function resolveArtworkImageUrl(savedImageName: string) {
  const name = encodeURIComponent(savedImageName);
  return `/artwork/${name}`;
}

async function fetchRecentArtworks(): Promise<RecentArtworkDto[]> {
  const res = await fetch(`/api/v1/artwork/new`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    // 로그인 필요하면 credentials 추가 (쿠키 세션이면 필요)
    // credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`recent artwork fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  return parseRecentArtworkList(json);
}

export function mountMuseumApp(args: {
  canvas: HTMLCanvasElement;
  uiRoot?: HTMLElement;
  onExitToExterior?: () => void;
  onEnteredToHall?: (startWaypointId: number) => void;
  introOnly?: boolean;

  // (선택) 전시장 "작품 상세보기"를 바깥 라우팅으로 넘기고 싶으면 사용
  onOpenArtwork?: (artworkId: number) => void;
}) {
  const canvas = args.canvas;
  const uiRoot = args.uiRoot ?? document.body;

  const uiLayer = document.createElement("div");
  uiLayer.id = "museum-ui-layer";
  uiLayer.dataset.museumUiLayer = "1";
  uiLayer.style.cssText =
    "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
    "z-index:9990;pointer-events:none;";
  uiRoot.appendChild(uiLayer);

  const uiMount = uiLayer;
  const toastHere = (msg: string, ms = 1200) => toast(msg, ms, uiMount);

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
      glbUrl: asset("museum/models/museum/intro_53.glb"),
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
      onEntered: () => {
        const wp = DEFAULT_HALL_START_WP;

        if (args.onEnteredToHall) {
          args.onEnteredToHall(wp);
          return;
        }
        if (!args.introOnly) startMainHall(wp);
      },
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

      if (!exitUiDispose) {
        exitUiDispose = mountExitOverlay({
          label: "Back to exterior",
          onExit: () => {
            console.log("[APP] Exit overlay clicked -> startIntro() (no reload)");
            sessionStorage.setItem(SKIP_KEY, "1");
            startIntro();
          },
          uiMount,
        });
      }
    } catch (e) {
      console.error("[museum] startMainHall failed:", e);
      toastHere("HALL FAILED (콘솔 확인)");
    }
  }

  const EXHIBIT_PANEL_COUNT = 15;

  /** ✅ 목업 파일 없이도 쓸 수 있는 placeholder (data URL) */
  function makePlaceholderDataUrl(label: string, w = 768, h = 768) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;

    const ctx = c.getContext("2d");
    if (!ctx) return "";

    // background
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, w, h);

    // subtle frame
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = Math.max(6, Math.floor(w * 0.01));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

    // title
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.floor(w * 0.07)}px ui-sans-serif, system-ui, -apple-system`;
    ctx.fillText(label, w / 2, h / 2);

    // sub
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `500 ${Math.floor(w * 0.035)}px ui-sans-serif, system-ui, -apple-system`;
    ctx.fillText("ARNNECT GALLERY", w / 2, h / 2 + Math.floor(h * 0.1));

    return c.toDataURL("image/png");
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

    // ✅ 항상 15칸을 채우는 panelItems 생성
    let panelItems: Array<{
      panelName: string;
      imageUrl: string;
      title: string;
      artworkId: number;
    }> = [];

    try {
      const list = await fetchNewArtists(); // ✅ /api/v1/artwork/new
      if (disposed) return;

      if (!list.length) {
        // API 성공했는데 빈 배열이면 placeholder
        panelItems = Array.from({ length: EXHIBIT_PANEL_COUNT }, (_, i) => ({
          panelName: `EX_PANEL_${i + 1}`,
          imageUrl: makePlaceholderDataUrl(`EMPTY ${i + 1}`),
          title: `EMPTY ${i + 1}`,
          artworkId: -1,
        }));
      } else {
        // ✅ 15개 미만이면 반복해서 15개 채움(목업 없이 실데이터 유지)
        panelItems = Array.from({ length: EXHIBIT_PANEL_COUNT }, (_, i) => {
          const a = list[i % list.length];

          const url = buildNewArtistImageUrl(a.savedImageName);
          const safeUrl = url || makePlaceholderDataUrl(`NO IMG ${i + 1}`);

          return {
            panelName: `EX_PANEL_${i + 1}`,
            imageUrl: safeUrl,
            title: a.title || `작품 ${i + 1}`,
            artworkId: a.artworkId,
          };
        });
      }

      console.log("[museum] exhibit panelItems:", panelItems);
    } catch (e) {
      console.warn("[museum] recent artworks failed -> placeholder", e);
      toastHere("RECENT LOAD FAILED → PLACEHOLDER");

      panelItems = Array.from({ length: EXHIBIT_PANEL_COUNT }, (_, i) => ({
        panelName: `EX_PANEL_${i + 1}`,
        imageUrl: makePlaceholderDataUrl(`OFFLINE ${i + 1}`),
        title: `OFFLINE ${i + 1}`,
        artworkId: -1,
      }));
    }

    exhibitRuntime = await mountExhibitRoom(canvas, {
      glbUrl: asset("museum/models/gallery/gallery5.glb"),
      resetRootTransform: true,
      uiMount,
      autoFitIfOff: true,
      debug: true,
      titleText: `${payload.artist} — ${payload.artworkTitle}`,

      panelItems,

      onExitToHall: () => {
        toastHere("BACK TO HALL");
        startMainHall(payload.fromWaypointId ?? DEFAULT_HALL_START_WP);
      },

      onOpenArtwork: (artworkId) => {
        console.log("[museum] onOpenArtwork:", artworkId);
        // 여기서 React 라우팅 콜백 연결 가능
        // args.onOpenArtwork?.(Number(artworkId));
      },
    });
  }





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
