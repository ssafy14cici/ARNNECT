import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { mountMuseumApp } from "../../museum/app/mountMuseumApp";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 3D 화면일 때 스크롤 방지(원치 않으면 제거)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const runtime = mountMuseumApp({
      canvas,
      onExitToExterior: () => {
        // 지금은 임시로 reload. (Step 4에서 라우팅/상태로 교체)
        window.location.reload();
      },
    });

    return () => {
      runtime.dispose();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="home-temp-container" style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}>
      {/* ✅ Three.js가 렌더링할 캔버스 */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* ✅ 기존 “수정 예정” UI는 오버레이로 유지 (원하면 지워도 됨) */}
      <div
        className="temp-content"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none", // 3D 클릭 막지 않게
        }}
      >
        {/* <div style={{ pointerEvents: "none", textAlign: "center" }}>
          <h1>수정 예정</h1>
          <p>PC 버전 홈 화면 준비 중입니다.</p>
        </div> */}
      </div>
    </div>
  );
}
