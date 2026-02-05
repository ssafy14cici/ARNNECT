// FE/src/pages/hall/Hall.tsx
import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { mountMainHallFree } from "../../museum/viewer/mainHallFree";

function asset(path: string) {
  // public 경로처럼 쓰기 위해 앞 슬래시 정리
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

export default function Hall() {
  const nav = useNavigate();
  const location = useLocation();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 가이드 토글 상태 (false: info.png, true: how.png)
  const [showGuide, setShowGuide] = useState(false);

  // 다른 페이지에서 Hall로 돌아올 때 startWaypointId를 state로 넘길 수 있음
  const startWaypointId = (location.state as any)?.startWaypointId ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    // Hall 진입 시 스크롤 막기(1인칭/3D 화면에서 스크롤 튐 방지)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ✅ mainHallFree가 버튼/UI를 붙일 컨테이너 (mountMuseumApp의 uiLayer 역할)
    const uiLayer = document.createElement("div");
    uiLayer.id = "museum-ui-layer";
    uiLayer.dataset.museumUiLayer = "1";
    uiLayer.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
      "z-index:9990;pointer-events:none;"; // 기본은 none, 버튼들은 내부에서 pointer-events 켤 수 있음
    uiRoot.appendChild(uiLayer);

    // ✅ 3D 메인홀 마운트
    const rt = mountMainHallFree(canvas, {
      glbUrl: asset("museum/models/museum/mh.glb"),
      startWaypointId,
      uiMount: uiLayer,

      onReady: () => {
        // 인트로 페이드 제거 트리거(프로젝트 기존 이벤트)
        window.dispatchEvent(new Event("intro:clear-fade"));
      },

      /**
       * ✅ "전시보러가기" 버튼을 눌렀을 때 mainHallFree.ts가 이 콜백을 호출한다.
       * 여기서 React Router로 페이지 이동을 처리해주세요야 함.
       */
      // onOpenExhibit: ({ artId, artist, artworkTitle, fromWaypointId }) => {
        // console.log("[Hall] onOpenExhibit:", {
        //   artId,
        //   artist,
        //   artworkTitle,
        //   fromWaypointId,
        // });

        // ✅ 관람(전시장) 페이지로 이동
        // nav(`/exhibit/${artistId}`, {
        //   state: {
        //     artId,
        //     artist,
        //     artworkTitle,
        //     fromWaypointId,
        //     from: "hall",
        //   },
        // });
      // },
      onOpenExhibit: ({ artistId }) => {
        console.log("[Hall] nav to", artistId);
        nav(`/exhibit/${artistId}`);
      }

    });

    // 언마운트(페이지 이동/새로고침 등)
    return () => {
      rt.destroy();
      uiLayer.remove();
      document.body.style.overflow = prevOverflow;
    };
  }, [startWaypointId, nav]);

  return (
    <div
      ref={wrapRef}
      className="home-temp-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* 가이드 토글 버튼 */}
      {!showGuide && (
        <img
          src={asset("info.png")}
          alt="가이드 보기"
          className="hall-guide-overlay"
          onClick={() => setShowGuide(true)}
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
      )}

      {/* 조작 가이드 오버레이 */}
      {showGuide && (
        <img
          src={asset("how.png")}
          alt="조작 가이드"
          className="hall-guide-overlay"
          onClick={() => setShowGuide(false)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            opacity: 0.85,
            cursor: "pointer",
            zIndex: 9980,
            width: "45%",
            height: "auto",
          }}
        />
      )}
    </div>
  );
}
