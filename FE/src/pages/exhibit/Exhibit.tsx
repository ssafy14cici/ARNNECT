import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { mountExhibitRoom } from "../../museum/viewer/exhibitRoom";
import type { PanelArtItem } from "../../museum/viewer/panelArt";

function asset(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

const PANEL_NAMES = [
  "EX_PANEL_1",
  "EX_PANEL_2",
  "EX_PANEL_3",
  "EX_PANEL_4",
  "EX_PANEL_5",
  "EX_PANEL_6",
  "EX_PANEL_7",
  "EX_PANEL_8",
  "EX_PANEL_9",
  "EX_PANEL_10",
  "EX_PANEL_11",
] as const;

// ✅ 임시: public/art/b1.jpg ~ b11.jpg가 있다고 가정
function buildMockPanels(): PanelArtItem[] {
  return PANEL_NAMES.map((panelName, idx) => ({
    panelName,
    title: `Artwork ${idx + 1}`,
    imageUrl: asset(`art/b${idx + 1}.jpg`),
    // (중요) 나중에 작품 상세로 보내려면 여기 artworkId 같은 것도 같이 실어두면 좋음
    // artworkId: idx + 1,  // <- PanelArtItem 타입에 없으면 일단 빼도 됨
  }));
}

export default function Exhibit() {
  const nav = useNavigate();
  const location = useLocation();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ✅ Hall.tsx랑 동일하게 UI layer 만들어서 exhibitRoom UI를 여기 위에 얹음
    const uiLayer = document.createElement("div");
    uiLayer.id = "museum-ui-layer";
    uiLayer.dataset.museumUiLayer = "1";
    uiLayer.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
      "z-index:9990;pointer-events:none;";
    uiRoot.appendChild(uiLayer);

    // ✅ Hall에서 넘어온 state(선택)
    const st = (location.state ?? {}) as any;
    const fromWaypointId = st.fromWaypointId ?? 0;
    const artist = st.artist ?? "";
    const artworkTitle = st.artworkTitle ?? "";

    const titleText =
      artist && artworkTitle ? `${artist} · ${artworkTitle}` : artist ? artist : "EXHIBIT";

    let cancelled = false;
    let runtime: { destroy: () => void } | null = null;

    (async () => {
      try {
        const rt = await mountExhibitRoom(canvas, {
          glbUrl: asset("museum/models/gallery/gallery5.glb"), // ✅ 너 프로젝트 전시장 glb 경로로 바꿔
          uiMount: uiLayer,
          titleText,
          panelItems: buildMockPanels(),

          // ✅ 홀로 돌아가기
          onExitToHall: () => {
            nav("/hall", { state: { startWaypointId: fromWaypointId } });
          },
        });

        if (cancelled) {
          rt.destroy();
          return;
        }
        runtime = rt;
      } catch (e) {
        console.error("[Exhibit] mount failed", e);
      }
    })();

    return () => {
      cancelled = true;
      runtime?.destroy();
      uiLayer.remove();
      document.body.style.overflow = prevOverflow;
    };
  }, [nav, location.state]);

  return (
    <div
      ref={wrapRef}
      className="home-temp-container"
      style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
