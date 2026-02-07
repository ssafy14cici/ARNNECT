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

        const artworkIdList = selections
          .slice()
          .sort((a, b) => a.round - b.round)
          .map((s) => s.artworkId)
          .filter((n) => typeof n === "number" && Number.isFinite(n));

        if (artworkIdList.length === 0) {
          throw new Error("선택한 작품 ID가 없습니다.");
        }

        const [mbtiCodeRaw] = await Promise.all([
          postPreference({ artworkIdList }, { skipAuth: !isLoggedIn }),
          sleep(900),
        ]);

        const mbtiCode = String(mbtiCodeRaw ?? "").trim().toUpperCase();

        if (!mbtiCode) {
          console.warn("[YourPreferenceResult] Empty MBTI code from server:", mbtiCodeRaw);
        }

        const resolved = resolveMbtiProfile(mbtiCode);
        const profile = resolved ?? buildFallbackProfile(mbtiCode);

        if (!resolved) {
          console.warn("[YourPreferenceResult] MBTI profile missing:", mbtiCode);
        }

        const next: ResultData = {
          mbti: mbtiCode || "UNKNOWN",
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
  }, [isLoggedIn, selections, setResultData, navigate]);

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

          <p className="result-desc result-tagline">{resultData?.tagline}</p>
          <p className="result-desc result-description">{resultData?.description}</p>

          {/* ✅ 여기: 클래스 부여해서 CSS로 공간/타이포 제어 */}
          <div className="result-details">
            <section className="result-section">
              <h3 className="result-section-title">강점</h3>
              <ul className="result-list">
                {resultData?.strengths?.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="result-section">
              <h3 className="result-section-title">주의점</h3>
              <ul className="result-list">
                {resultData?.watchouts?.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="result-section">
              <h3 className="result-section-title">팁</h3>
              <p className="result-tip">{resultData?.tip}</p>
            </section>
          </div>

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
              취향결과확인하기
            </Link>
          )}
        </div>
      </div>
    );
  }, [isLoggedIn, resultData, navigate]);

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
      <p className="analyzing-sub error-sub">{errorMsg || "잠시 후 다시 시도해주세요."}</p>

      <div className="result-actions result-actions--error">
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
