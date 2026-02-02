import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { mountMuseumApp } from "../../museum/app/mountMuseumApp";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uiRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = uiRootRef.current;
    if (!canvas || !uiRoot) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const runtime = mountMuseumApp({
      canvas,
      uiRoot: uiRoot ?? undefined, // ✅ 추가
      onExitToExterior: () => window.location.reload(),
    });

    return () => {
      runtime.dispose();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="home-temp-container"
      style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* ✅ museum이 만드는 모든 DOM(UI)을 여기로 모음 */}
      <div 
        ref={uiRootRef} 
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 50,
          // pointerEvents: "none", // 기본은 막고, 필요한 요소만 auto로 열기
        }}
        className="museum-ui-root"
         />
    </div>
  );
}
