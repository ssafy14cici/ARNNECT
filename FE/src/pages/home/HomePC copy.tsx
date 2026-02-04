import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { mountMuseumApp } from "../../museum/app/mountMuseumApp";

export default function Home() {
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
      uiRoot,                // ✅ 이거 꼭!
      onExitToExterior: () => window.location.reload(),
    });

    return () => {
      runtime.dispose();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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
