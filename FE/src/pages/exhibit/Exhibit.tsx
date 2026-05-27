// FE/src/pages/exhibit/Exhibit.tsx
import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { mountExhibitRoom } from "../../museum/viewer/exhibitRoom";
import type { PanelArtItem } from "../../museum/viewer/panelArt";
import { bgmIsOn, bgmToggle, bgmForcePlayOnInteraction } from "../../shared/audio/bgm";

// ✅ API
import { fetchArtworksByArtist, buildNewArtistImageUrl } from "../../features/artworks/api/newArtists";
import { getDemoArtworkImage } from "../../features/artworks/api/demoArtworks";

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

const EXHIBIT_PANEL_COUNT = PANEL_NAMES.length;

/** ✅ 작가 작품 목록 → 패널 아이템 변환 */
async function buildPanelsByArtist(artistId: string | null): Promise<PanelArtItem[]> {
  // artistId 없으면 전부 placeholder
  if (!artistId) {
    return PANEL_NAMES.map((panelName, idx) => ({
      panelName,
      title: `Demo Artwork ${idx + 1}`,
      imageUrl: getDemoArtworkImage(idx),
      // Demo artwork ids keep the frontend-only exhibit navigable.
      artworkId: 9001 + idx,
    }));
  }

  try {
    const list = await fetchArtworksByArtist(artistId);

    if (!list.length) {
      return PANEL_NAMES.map((panelName, idx) => ({
        panelName,
        title: `Demo Artwork ${idx + 1}`,
        imageUrl: getDemoArtworkImage(idx),
        artworkId: 9001 + idx,
      }));
    }

    // ✅ 패널 수만큼 채우되, 작품이 부족하면 순환해서 채움
    const panels: PanelArtItem[] = PANEL_NAMES.map((panelName, idx) => {
      const a = list[idx % list.length];

      const url = buildNewArtistImageUrl(a.imageUrl || a.savedImageName);
      const safeUrl = url || getDemoArtworkImage(idx);

      return {
        panelName,
        title: a.title || `작품 ${idx + 1}`,
        imageUrl: safeUrl,

        // ✅ 핵심: exhibitRoom이 이 값을 mesh.userData.__artworkId로 박음
        artworkId: a.artworkId,
      };
    });

    return panels;
  } catch (e) {
    console.warn("[Exhibit] fetchArtworksByArtist failed -> placeholder", e);
    return PANEL_NAMES.map((panelName, idx) => ({
      panelName,
      title: `Demo Artwork ${idx + 1}`,
      imageUrl: getDemoArtworkImage(idx),
      artworkId: 9001 + idx,
    }));
  }
}

type ExhibitRuntime = {
  destroy: () => void;
  goTo: (i: number, dur?: number) => void;
  getIndex: () => number;
  strafeLeft: (dist?: number) => void;
  strafeRight: (dist?: number) => void;
};

export default function Exhibit() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams<{ artistId: string }>();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ExhibitRuntime | null>(null);

  const [showGuide, setShowGuide] = useState(false);
  const [bgmOn, setBgmOn] = useState(() => bgmIsOn());

  const artistId = params.artistId ?? null;

  useEffect(() => {
    const cleanup = bgmForcePlayOnInteraction();
    return cleanup;
  }, []);

  console.log("[Exhibit] params.artistId:", artistId);
  console.log("[Exhibit] location.state:", JSON.stringify(location.state));

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    console.log("[Exhibit] mount → artistId:", artistId);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const uiLayer = document.createElement("div");
    uiLayer.id = "museum-ui-layer";
    uiLayer.dataset.museumUiLayer = "1";
    uiLayer.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
      "z-index:9990;pointer-events:none;";
    uiRoot.appendChild(uiLayer);

    const st = (location.state ?? {}) as any;
    const fromWaypointId = st.fromWaypointId ?? 0;
    const artist = st.artist ?? "";
    const artworkTitle = st.artworkTitle ?? "";

    const titleText = artist ? `${artist}작가 전시` : "EXHIBIT";

    let cancelled = false;

    (async () => {
      try {
        console.log("[Exhibit] buildPanelsByArtist 시작");
        const panelItems = await buildPanelsByArtist(artistId);
        if (cancelled) return;

        console.log("[Exhibit] mountExhibitRoom 호출 →", { artistId, titleText });

        const rt = await mountExhibitRoom(canvas, {
          glbUrl: asset("museum/models/gallery/gallery5.glb"),
          uiMount: uiLayer,
          titleText,
          panelItems,
          artistId,

          onExitToHall: () => {
            console.log("[Exhibit] onExitToHall → /hall, fromWaypointId:", fromWaypointId);
            nav("/hall", { state: { startWaypointId: fromWaypointId } });
          },

          onOpenArtist: (id) => {
            console.log("[Exhibit] onOpenArtist → /members/", id);
            nav(`/members/${encodeURIComponent(String(id))}`);
          },

          // ✅ 이제 artworkId가 들어오므로 상세보기 정상 동작
          onOpenArtwork: (artworkId) => {
            console.log("[Exhibit] onOpenArtwork → /artworks/", artworkId);
            nav(`/artworks/${encodeURIComponent(String(artworkId))}`);
          },
        });

        if (cancelled) {
          rt.destroy();
          return;
        }
        runtimeRef.current = rt;
        console.log("[Exhibit] ✅ mountExhibitRoom 완료");
      } catch (e) {
        console.error("[Exhibit] mount failed", e);
      }
    })();

    return () => {
      cancelled = true;
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
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

      {!showGuide && (
        <img
          src={asset("/settings/info_ex.png")}
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

      <img
        src={asset(bgmOn ? "bgm/exhibit_on.png" : "bgm/exhibit_off.png")}
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

      {showGuide && (
        <img
          src={asset("/settings/how_ex.png")}
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
