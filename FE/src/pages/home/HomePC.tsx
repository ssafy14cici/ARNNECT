// FE/src/pages/home/HomePC.tsx
import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { mountMuseumApp } from "../../museum/app/mountMuseumApp";

export default function HomePC() {
  const nav = useNavigate();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

      // (선택) 외부로 나가기 동작을 라우팅으로 바꾸고 싶으면 여기서 처리
      // onExitToExterior: () => nav("/", { replace: true }),
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
    </div>
  );
}
