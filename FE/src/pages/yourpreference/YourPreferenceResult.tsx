// FE/src/pages/yourpreference/YourPreferenceResult.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { usePreferenceStore, type ResultData } from "./preferenceStore";
import { postPreference } from "./preferenceApi";
import { resolveMbtiProfile, buildFallbackProfile } from "./mbtiProfiles";

import "./yourpreference.css";

type ViewStep = "ANALYZING" | "RESULT" | "ERROR";

const KEY_PREF_USED = "arnnect_pref_used_v1";
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";
const getPrefStorage = () => (USE_MOCK ? localStorage : sessionStorage);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildKeywords(strengths: readonly string[]) {
  return strengths.slice(0, 4).map((s) => `#${s.replace(/\s+/g, "_")}`);
}

export default function YourPreferenceResult() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();

  const selections = usePreferenceStore((s) => s.selections);
  const resultData = usePreferenceStore((s) => s.resultData);
  const setResultData = usePreferenceStore((s) => s.setResultData);
  const reset = usePreferenceStore((s) => s.reset);

  const [viewStep, setViewStep] = useState<ViewStep>("ANALYZING");
  const [errorMsg, setErrorMsg] = useState("");

  // selections 없이 진입 → /preference로
  useEffect(() => {
    if (!selections || selections.length === 0) {
      navigate("/preference", { replace: true });
    }
  }, [selections, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      getPrefStorage().setItem(KEY_PREF_USED, "true");
    }

    let alive = true;

    (async () => {
      try {
        setErrorMsg("");
        setViewStep("ANALYZING");

        // ✅ 라운드 순서대로 artworkIdList 구성
        const artworkIdList = selections
          .slice()
          .sort((a, b) => a.round - b.round)
          .map((s) => s.artworkId)
          .filter((n) => typeof n === "number" && Number.isFinite(n));

        if (artworkIdList.length === 0) {
          throw new Error("선택한 작품 ID가 없습니다.");
        }

        const [mbtiCode] = await Promise.all([
          postPreference({ artworkIdList }, { skipAuth: !isLoggedIn }),
          sleep(900), // UX용 최소 로딩 시간(원치 않으면 제거)
        ]);

        // ✅ 여기부터가 핵심 수정:
        // - 매핑이 없으면 throw 하지 말고 fallback으로라도 결과 화면은 보여주기
        const profile = resolveMbtiProfile(mbtiCode) ?? buildFallbackProfile(mbtiCode);

        // 프로필 누락이면 콘솔 경고만 남김(UX는 살림)
        if (!resolveMbtiProfile(mbtiCode)) {
          console.warn("[YourPreferenceResult] MBTI profile missing:", mbtiCode);
        }

        const next: ResultData = {
          mbti: String(mbtiCode ?? "").trim(), // 서버가 string 아니어도 안전하게 표시
          title: profile.title,
          tagline: profile.tagline,
          description: profile.description,
          strengths: [...profile.strengths],
          watchouts: [...profile.watchouts],
          tip: profile.tip,
          keywords: buildKeywords(profile.strengths),
        };

        if (!alive) return;
        setResultData(next);
        setViewStep("RESULT");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "결과를 불러오지 못했습니다.";
        if (!alive) return;
        setErrorMsg(msg);
        setViewStep("ERROR");
      }
    })();

    return () => {
      alive = false;
    };
  }, [isLoggedIn, selections, setResultData]);

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

          <p className="result-desc" style={{ whiteSpace: "pre-line", opacity: 0.9 }}>
            {resultData?.tagline}
          </p>
          <p className="result-desc" style={{ whiteSpace: "pre-line" }}>
            {resultData?.description}
          </p>

          <div style={{ marginTop: 16, textAlign: "left" }}>
            <h3 style={{ margin: "12px 0 6px" }}>강점</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {resultData?.strengths?.map((s) => <li key={s}>{s}</li>)}
            </ul>

            <h3 style={{ margin: "12px 0 6px" }}>주의점</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {resultData?.watchouts?.map((s) => <li key={s}>{s}</li>)}
            </ul>

            <h3 style={{ margin: "12px 0 6px" }}>팁</h3>
            <p style={{ margin: 0, whiteSpace: "pre-line" }}>{resultData?.tip}</p>
          </div>

          <div className="result-keywords">
            {resultData?.keywords?.map((k) => <span key={k}>{k}</span>)}
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
              취향결과확인하기
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
      <p className="analyzing-sub">패턴 인식 중 • 예술 성향 도출 중 • 취향 업데이트 중</p>
    </div>
  );

  const ErrorView = (
    <div className="pref-analyzing fade-in">
      <h2 className="analyzing-text">결과를 불러오지 못했습니다</h2>
      <p className="analyzing-sub" style={{ whiteSpace: "pre-line" }}>
        {errorMsg || "잠시 후 다시 시도해주세요."}
      </p>

      <div className="result-actions" style={{ marginTop: 16 }}>
        <button className="pref-btn-secondary" onClick={retry}>
          다시 하기
        </button>
        <Link to="/preference" className="pref-btn-primary">
          처음으로
        </Link>
      </div>
    </div>
  );

  return (
    <div className="pref-page">
      <div className="pref-container">
        {viewStep === "ANALYZING" && AnalyzingView}
        {viewStep === "RESULT" && ResultView}
        {viewStep === "ERROR" && ErrorView}
      </div>
    </div>
  );
}
