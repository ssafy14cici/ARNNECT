// FE/src/pages/exhibit/Exhibit.tsx
import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { mountExhibitRoom } from "../../museum/viewer/exhibitRoom";
import type { PanelArtItem } from "../../museum/viewer/panelArt";
import { bgmIsOn, bgmToggle, bgmForcePlayOnInteraction } from "../../shared/audio/bgm";

// ✅ API
import { fetchArtworksByArtist, buildNewArtistImageUrl } from "../../features/artworks/api/newArtists";

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

/** ✅ placeholder (data URL) */
function makePlaceholderDataUrl(label: string, w = 768, h = 768) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;

  const ctx = c.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.01));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.floor(w * 0.07)}px ui-sans-serif, system-ui, -apple-system`;
  ctx.fillText(label, w / 2, h / 2);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 ${Math.floor(w * 0.035)}px ui-sans-serif, system-ui, -apple-system`;
  ctx.fillText("ARNNECT EXHIBIT", w / 2, h / 2 + Math.floor(h * 0.1));

  return c.toDataURL("image/png");
}

/** ✅ 작가 작품 목록 → 패널 아이템 변환 */
async function buildPanelsByArtist(artistId: string | null): Promise<PanelArtItem[]> {
  // artistId 없으면 전부 placeholder
  if (!artistId) {
    return PANEL_NAMES.map((panelName, idx) => ({
      panelName,
      title: `EMPTY ${idx + 1}`,
      imageUrl: makePlaceholderDataUrl(`EMPTY ${idx + 1}`),
      // ✅ placeholder는 artworkId 없음 (상세보기 막기)
      artworkId: undefined,
    }));
  }

  try {
    const list = await fetchArtworksByArtist(artistId);

    if (!list.length) {
      return PANEL_NAMES.map((panelName, idx) => ({
        panelName,
        title: `EMPTY ${idx + 1}`,
        imageUrl: makePlaceholderDataUrl(`EMPTY ${idx + 1}`),
        artworkId: undefined,
      }));
    }

    // ✅ 패널 수만큼 채우되, 작품이 부족하면 순환해서 채움
    const panels: PanelArtItem[] = PANEL_NAMES.map((panelName, idx) => {
      const a = list[idx % list.length];

      const url = buildNewArtistImageUrl(a.imageUrl || a.savedImageName);
      const safeUrl = url || makePlaceholderDataUrl(`NO IMG ${idx + 1}`);

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
      title: `OFFLINE ${idx + 1}`,
      imageUrl: makePlaceholderDataUrl(`OFFLINE ${idx + 1}`),
      artworkId: undefined,
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

  const handleLeft = () => runtimeRef.current?.strafeLeft();
  const handleRight = () => runtimeRef.current?.strafeRight();

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

    const titleText = artist ? `${artist} 전시` : "EXHIBIT";

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

      <button
        type="button"
        onClick={handleLeft}
        style={{
          position: "fixed",
          left: 24,
          top: "50%",
          transform: "translateY(-50%)",
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 9985,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.6)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.4)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1)";
        }}
        aria-label="왼쪽 이동"
      >
        ◀
      </button>

      <button
        type="button"
        onClick={handleRight}
        style={{
          position: "fixed",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 9985,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.6)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.4)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1)";
        }}
        aria-label="오른쪽 이동"
      >
        ▶
      </button>

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
