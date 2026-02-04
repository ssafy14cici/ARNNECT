import "../../styles/home.css";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { mountMainHallFree } from "../../museum/viewer/mainHallFree";

function asset(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

export default function Hall() {
  const nav = useNavigate();
  const location = useLocation();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startWaypointId =
    (location.state as any)?.startWaypointId ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiRoot = wrapRef.current;
    if (!canvas || !uiRoot) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ✅ mountMuseumApp이 만들던 uiLayer 역할을 여기서 간단히 만들어줌
    const uiLayer = document.createElement("div");
    uiLayer.id = "museum-ui-layer";
    uiLayer.dataset.museumUiLayer = "1";
    uiLayer.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;" +
      "z-index:9990;pointer-events:none;";
    uiRoot.appendChild(uiLayer);

    const rt = mountMainHallFree(canvas, {
      glbUrl: asset("museum/models/museum/mh_add_5.glb"),
      startWaypointId,
      uiMount: uiLayer,

      onReady: () => {
        window.dispatchEvent(new Event("intro:clear-fade"));
      },

      // 전시로 들어가는 건 일단 기존 mountMuseumApp 구조가 있으니,
      // 다음 단계에서 여기서 /exhibit 같은 라우트로 넘기거나,
      // 다시 mountMuseumApp을 쓰는 방식으로 확장 가능
    });

    return () => {
      rt.destroy();
      uiLayer.remove();
      document.body.style.overflow = prevOverflow;
    };
  }, [startWaypointId]);

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
