import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../styles/auth.css";
import UserSignup from "./UserSignup";
import ArtistSignup from "./ArtistSignup";

type SignupType = "TYPE" | "USER" | "ARTIST";

export default function Signup() {
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("type")?.toUpperCase() as SignupType) || "TYPE";
  const [mode, setMode] = useState<SignupType>(initial);

  useEffect(() => {
    if (mode === "TYPE") setSp({}, { replace: true });
    else setSp({ type: mode.toLowerCase() }, { replace: true });
  }, [mode, setSp]);

  if (mode === "USER") return <UserSignup onBack={() => setMode("TYPE")} />;
  if (mode === "ARTIST") return <ArtistSignup onBack={() => setMode("TYPE")} />;

  return (
    <div className="auth-page auth-type">
      <div className="auth-type-head">
        <div className="auth-type-title">회원가입</div>
        <div className="auth-type-sub">숨겨진 예술가를 발굴하고, 당신의 취향을 완성하세요</div>
      </div>

      <div className="auth-type-grid">
        <div className="auth-type-card">
          <div className="auth-type-card-title">일반 회원가입</div>
          <div className="auth-type-card-desc">
            숨겨진 예술가를 발굴하고<br />당신의 취향을 완성하세요
          </div>
          <button className="auth-type-btn" onClick={() => setMode("USER")}>
            일반 회원으로 시작하기
          </button>
        </div>

        <div className="auth-type-card">
          <div className="auth-type-card-title">예술인 회원가입</div>
          <div className="auth-type-card-desc">
            나만 아는 예술가가 아닌<br />누구나 아는 예술가로 나아갑니다.
          </div>
          <button className="auth-type-btn" onClick={() => setMode("ARTIST")}>
            예술인으로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
