import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { mountExhibitRoom } from "../../museum/viewer/exhibitRoom";
import type { PanelArtItem } from "../../museum/viewer/panelArt";
import { bgmIsOn, bgmToggle, bgmForcePlayOnInteraction } from "../../shared/audio/bgm";

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
    imageUrl: asset(`art/a${idx + 1}.jpg`),
    // (중요) 나중에 작품 상세로 보내려면 여기 artworkId 같은 것도 같이 실어두면 좋음
    // artworkId: idx + 1,  // <- PanelArtItem 타입에 없으면 일단 빼도 됨
  }));
}

export default function Exhibit() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams<{ artistId: string }>();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 가이드 토글 상태 (false: info.png, true: how_ex.png)
  const [showGuide, setShowGuide] = useState(false);

  // ✅ 전역 BGM 상태와 동기화
  const [bgmOn, setBgmOn] = useState(() => bgmIsOn());

  // ✅ URL params에서 artistId 가져오기 (/exhibit/:artistId)
  const artistId = params.artistId ?? null;

  // 전역 BGM: 마운트 시 재생 시도
  useEffect(() => {
    const cleanup = bgmForcePlayOnInteraction();
    return cleanup;
  }, []);

  console.log("[Exhibit] 🔍 params.artistId:", artistId);
  console.log("[Exhibit] 🔍 location.state:", JSON.stringify(location.state));

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    console.log("[Exhibit] mount → artistId:", artistId);

    if (!artistId) {
      console.warn("[Exhibit] ⚠️ artistId가 없음! URL을 확인하세요 (/exhibit/:artistId)");
    }

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

    console.log("[Exhibit] 🔍 state:", { fromWaypointId, artist, artworkTitle, artId: st.artId });

    const titleText =
      artist && artworkTitle ? `${artist} · ${artworkTitle}` : artist ? artist : "EXHIBIT";

    let cancelled = false;
    let runtime: { destroy: () => void } | null = null;

    (async () => {
      try {
        console.log("[Exhibit] mountExhibitRoom 호출 →", { artistId, titleText });

        const rt = await mountExhibitRoom(canvas, {
          glbUrl: asset("museum/models/gallery/gallery5.glb"),
          uiMount: uiLayer,
          titleText,
          panelItems: buildMockPanels(),

          // ✅ 홀로 돌아가기
          onExitToHall: () => {
            console.log("[Exhibit] onExitToHall → /hall, fromWaypointId:", fromWaypointId);
            nav("/hall", { state: { startWaypointId: fromWaypointId } });
          },
        });

        if (cancelled) {
          rt.destroy();
          return;
        }
        runtime = rt;
        console.log("[Exhibit] ✅ mountExhibitRoom 완료");
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
  }, [nav, location.state, artistId]);

  return (
    <div
      ref={wrapRef}
      className="home-temp-container"
      style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* 가이드 토글 버튼 */}
      {!showGuide && (
        <img
          src={asset("info_ex.png")}
          alt="가이드 보기"
          className="exhibit-guide-overlay"
          onClick={() => setShowGuide(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "72px",
            opacity: 0.5,
            cursor: "pointer",
            zIndex: 9980,
            width: "40px",
            height: "auto",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
        />
      )}

      {/* BGM ON/OFF 토글 버튼 */}
      <img
        src={asset(bgmOn ? "bgm/bgm_on.png" : "bgm/bgm_off.png")}
        alt={bgmOn ? "BGM ON" : "BGM OFF"}
        onClick={() => {
          const next = bgmToggle();
          setBgmOn(next);
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          opacity: 0.5,
          cursor: "pointer",
          zIndex: 9980,
          width: "40px",
          height: "auto",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
      />

      {/* 조작 가이드 오버레이 */}
      {showGuide && (
        <img
          src={asset("how_ex.png")}
          alt="조작 가이드"
          className="exhibit-guide-overlay"
          onClick={() => setShowGuide(false)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            opacity: 0.85,
            cursor: "pointer",
            zIndex: 9980,
            width: "40%",
            height: "auto",
          }}
        />
      )}
    </div>
  );
}
