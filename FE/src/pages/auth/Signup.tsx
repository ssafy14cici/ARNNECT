import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./signup.css"; 
import UserSignup from "./user/UserSignup";
import ArtistSignup from "./artist/ArtistSignup";

type SignupType = "TYPE" | "USER" | "ARTIST";

export default function Signup() {
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("type")?.toUpperCase() as SignupType) || "TYPE";
  const [mode, setMode] = useState<SignupType>(initial);
  
  // 호버 인터랙션을 위한 state
  const [hovered, setHovered] = useState<"USER" | "ARTIST" | null>(null);

  useEffect(() => {
    if (mode === "TYPE") setSp({}, { replace: true });
    else setSp({ type: mode.toLowerCase() }, { replace: true });
  }, [mode, setSp]);

  // 하위 컴포넌트 렌더링
  if (mode === "USER") return <UserSignup onBack={() => setMode("TYPE")} />;
  if (mode === "ARTIST") return <ArtistSignup onBack={() => setMode("TYPE")} />;

  // 메인 진입점 (TYPE 선택 화면)
  return (
    <div className="signup-page">
      {/* 배경 텍스트 (장식용) */}
      <div className="bg-decoration">CHOOSE YOUR JOURNEY</div>

      <div className="split-container">
        
        {/* 1. 일반 회원 (Collector) */}
        <div 
          className={`split-pane user-pane ${hovered === "USER" ? "expanded" : ""} ${hovered === "ARTIST" ? "shrink" : ""}`}
          onMouseEnter={() => setHovered("USER")}
          onMouseLeave={() => setHovered(null)}
          onClick={() => setMode("USER")}
        >
          <div className="pane-bg user-bg" />
          <div className="pane-overlay" />
          
          <div className="pane-content">
            <span className="pane-subtitle">For Art Lovers</span>
            <h2 className="pane-title">Collector</h2>
            <p className="pane-desc">
              숨겨진 예술가를 발굴하고<br />
              당신만의 취향을 완성하세요.
            </p>
            <div className="pane-btn">
              <span>Join as Collector</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>

        {/* 2. 예술인 회원 (Artist) */}
        <div 
          className={`split-pane artist-pane ${hovered === "ARTIST" ? "expanded" : ""} ${hovered === "USER" ? "shrink" : ""}`}
          onMouseEnter={() => setHovered("ARTIST")}
          onMouseLeave={() => setHovered(null)}
          onClick={() => setMode("ARTIST")}
        >
          <div className="pane-bg artist-bg" />
          <div className="pane-overlay" />
          
          <div className="pane-content">
            <span className="pane-subtitle">For Creators</span>
            <h2 className="pane-title">Artist</h2>
            <p className="pane-desc">
              나만 아는 예술가가 아닌<br />
              누구나 아는 예술가로 나아갑니다.
            </p>
            <div className="pane-btn">
              <span>Join as Artist</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}