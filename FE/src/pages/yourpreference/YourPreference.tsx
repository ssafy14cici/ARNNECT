// FE/src/pages/yourpreference/YourPreference.tsx
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import { usePreferenceStore } from "./preferenceStore";
import "./yourpreference.css";

const KEY_PREF_USED = "arnnect_pref_used_v1";
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

function getPrefStorage(): Storage {
  return USE_MOCK ? localStorage : sessionStorage;
}

export default function YourPreference() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();

  const reset = usePreferenceStore((s) => s.reset);

  const checkLimit = () => {
    if (isLoggedIn) return true;
    const used = getPrefStorage().getItem(KEY_PREF_USED) === "true";
    return !used;
  };

  const startTest = () => {
    if (!checkLimit()) {
      const ok = window.confirm(
        "비회원은 한 번만 참여할 수 있습니다.\n회원가입 후 무제한으로 즐겨보세요!",
      );
      if (ok) navigate("/signup");
      return;
    }

    // 새로 시작: 상태 초기화 후 select로
    reset();
    navigate("/preference/select");
  };

  return (
    <div className="pref-page">
      <div className="pref-container">
        <div className="pref-intro fade-in">
          <h1 className="pref-title">
            Find Your <br />
            <span className="gold-text">Art Persona</span>
          </h1>

          <p className="pref-desc">
            이름도, 장르도 모른 채 오직 <strong>그림</strong>만으로 선택하세요.
            <br />
            ARNNECT가 당신의 무의식 속 예술 취향을 찾아드립니다.
          </p>

          <div className="pref-badges">
            <span>#블라인드테스트</span>
            <span>#나의_취향_찾기</span>
            <span>#AI분석</span>
          </div>

          <button className="pref-btn-start" onClick={startTest}>
            취향 분석 시작하기
          </button>

          {!isLoggedIn && (
            <p className="pref-limit-notice">* 비회원은 1회만 가능합니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
