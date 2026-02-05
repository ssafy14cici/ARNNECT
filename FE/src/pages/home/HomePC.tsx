// FE/src/pages/home/HomePC.tsx
import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { mountMuseumApp } from "../../museum/app/mountMuseumApp";
import { bgmIsOn, bgmToggle, bgmForcePlayOnInteraction } from "../../shared/audio/bgm";

function asset(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

export default function HomePC() {
  const nav = useNavigate();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI 토글 상태 (전역 BGM 매니저와 동기화)
  const [bgmOn, setBgmOn] = useState(() => bgmIsOn());

  // 전역 BGM: 마운트 시 재생 시도 + 첫 인터랙션 강제 재생
  useEffect(() => {
    const cleanup = bgmForcePlayOnInteraction();
    return cleanup; // unmount 시 리스너 정리만 (오디오는 끊지 않음!)
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const runtime = mountMuseumApp({
      canvas,
      uiRoot,

      // ✅ 인트로(로딩→외부→홀드→진입) 끝나면 진짜 메인홀(/hall)로 라우팅
      onEnteredToHall: (startWaypointId) => {
        nav("/hall", { replace: true, state: { startWaypointId } });
      },

      // ✅ 이 페이지에서는 인트로까지만 수행하고, 홀은 /hall에서 실행
      introOnly: true,
    });

    return () => {
      runtime.dispose();
      document.body.style.overflow = prevOverflow;
    };
  }, [nav]);

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
    </div>
  );
}
