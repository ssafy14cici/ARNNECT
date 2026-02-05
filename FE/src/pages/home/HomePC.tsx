// FE/src/pages/home/HomePC.tsx
import "../../styles/home.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { mountMuseumApp } from "../../museum/app/mountMuseumApp";

function asset(path: string) {
  const p = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${p}`;
}

export default function HomePC() {
  const nav = useNavigate();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // BGM 토글 상태 (false: off, true: on)
  const [bgmOn, setBgmOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // BGM Audio 초기화 + 첫 인터랙션에서 강제 재생
  useEffect(() => {
    const audio = new Audio(asset("bgm/fake_intro.mp3"));
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    // 즉시 재생 시도
    const tryPlay = () => {
      if (audioRef.current && bgmOn) {
        audioRef.current.play().catch(() => {});
      }
    };
    tryPlay();

    // 브라우저 정책으로 막힌 경우: 첫 인터랙션에서 재생
    const forcePlay = () => {
      tryPlay();
      window.removeEventListener("click", forcePlay);
      window.removeEventListener("touchstart", forcePlay);
      window.removeEventListener("keydown", forcePlay);
    };
    window.addEventListener("click", forcePlay, { once: true });
    window.addEventListener("touchstart", forcePlay, { once: true });
    window.addEventListener("keydown", forcePlay, { once: true });

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      window.removeEventListener("click", forcePlay);
      window.removeEventListener("touchstart", forcePlay);
      window.removeEventListener("keydown", forcePlay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // bgmOn 상태에 따라 재생/정지
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (bgmOn) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [bgmOn]);

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

      {/* BGM ON/OFF 토글 버튼 */}
      <img
        src={asset(bgmOn ? "bgm/bgm_on.png" : "bgm/bgm_off.png")}
        alt={bgmOn ? "BGM ON" : "BGM OFF"}
        onClick={() => setBgmOn((prev) => !prev)}
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
