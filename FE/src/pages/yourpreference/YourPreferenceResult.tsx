import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import { usePreferenceStore, type ResultData } from "./preferenceStore";
import "./yourpreference.css";

type ViewStep = "ANALYZING" | "RESULT";

const KEY_PREF_USED = "arnnect_pref_used_v1";
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";
const getPrefStorage = () => (USE_MOCK ? localStorage : sessionStorage);

export default function YourPreferenceResult() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();

  const selections = usePreferenceStore((s) => s.selections);
  const resultData = usePreferenceStore((s) => s.resultData);
  const setResultData = usePreferenceStore((s) => s.setResultData);
  const reset = usePreferenceStore((s) => s.reset);

  const [viewStep, setViewStep] = useState<ViewStep>("ANALYZING");

  // selections 없이 진입 → /preference로
  useEffect(() => {
    if (!selections || selections.length === 0) {
      navigate("/preference", { replace: true });
    }
  }, [selections, navigate]);

  useEffect(() => {
    // 비회원이면 1회 사용 처리 기록
    if (!isLoggedIn) {
      getPrefStorage().setItem(KEY_PREF_USED, "true");
    }

    setViewStep("ANALYZING");
    const t = window.setTimeout(() => {
      // TODO: selections를 서버로 전송해 결과 받기(현재 백엔드는 GET만 있음)
      const mock: ResultData = {
        mbti: "V.A.S.T",
        title: "몽환적인 밤의 탐험가",
        desc: "당신은 현실보다는 추상적인 감정과 깊은 색채에 끌리는 유형입니다. 정해진 형체보다는 흐르는듯한 붓터치에서 안정을 느낍니다.",
        keywords: ["#추상", "#딥블루", "#텍스처", "#이모셔널"],
        recommendArtist: "신진작가 김루멘",
      };
      setResultData(mock);
      setViewStep("RESULT");
    }, 3000);

    return () => window.clearTimeout(t);
  }, [isLoggedIn, setResultData]);

  const retry = () => {
    reset();
    navigate("/preference/select");
  };

  const ResultView = useMemo(() => {
    return (
      <div className="pref-result fade-in">
        <div className="result-card">
          <div className="result-header">YOUR ART MBTI</div>
          <h1 className="result-type gold-text">{resultData?.mbti}</h1>
          <h2 className="result-title">{resultData?.title}</h2>
          <p className="result-desc">{resultData?.desc}</p>

          <div className="result-keywords">
            {resultData?.keywords?.map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
        </div>

        <div className="result-actions">
          <button className="pref-btn-secondary" onClick={retry}>
            다시 하기
          </button>

          {!isLoggedIn && (
            <Link to="/signup" className="pref-btn-primary">
              회원가입하고 결과 저장하기
            </Link>
          )}

          {isLoggedIn && (
            <Link to="/feed" className="pref-btn-primary">
              취향결과알아보기(피드페이지)
            </Link>
          )}
        </div>
      </div>
    );
  }, [isLoggedIn, resultData]);

  const AnalyzingView = (
    <div className="pref-analyzing fade-in">
      <div className="analyzing-loader">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      <h2 className="analyzing-text">AI가 당신의 선택을 분석하고 있습니다...</h2>
      <p className="analyzing-sub">패턴 인식 중 • 예술 성향 도출 중 • 추천 작가 매칭 중</p>
    </div>
  );

  return (
    <div className="pref-page">
      <div className="pref-container">
        {viewStep === "ANALYZING" && AnalyzingView}
        {viewStep === "RESULT" && ResultView}
      </div>
    </div>
  );
}
