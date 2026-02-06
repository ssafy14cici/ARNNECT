import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { usePreferenceStore } from "./preferenceStore";
import { getPreferenceRounds, type PreferenceRound } from "./preferenceApi";

// ✅ 네가 이미 쓰는 함수 그대로 사용
import { resolveMediaUrl } from "../artworks/detail/utils";

import "./yourpreference.css";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function YourPreferenceSelect() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();

  const currentRoundIdx = usePreferenceStore((s) => s.currentRoundIdx);
  const setRoundIdx = usePreferenceStore((s) => s.setRoundIdx);
  const addSelection = usePreferenceStore((s) => s.addSelection);

  const [state, setState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [rounds, setRounds] = useState<PreferenceRound[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setState("loading");
        setErrorMsg("");

        const data = await getPreferenceRounds({ skipAuth: !isLoggedIn });

        if (!alive) return;

        if (!data || data.length === 0) {
          throw new Error("선택할 작품 데이터가 없습니다.");
        }

        setRounds(data);

        // 인덱스가 범위 밖이면 0으로 리셋
        if (currentRoundIdx < 0 || currentRoundIdx >= data.length) {
          setRoundIdx(0);
        }

        setState("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "데이터 로드 실패";
        if (!alive) return;
        setErrorMsg(msg);
        setState("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [isLoggedIn, currentRoundIdx, setRoundIdx]);

  const round = useMemo(() => rounds[currentRoundIdx], [rounds, currentRoundIdx]);

  if (state === "loading" || state === "idle") {
    return (
      <div className="pref-page">
        <div className="pref-container">
          <div className="pref-analyzing fade-in">
            <h2 className="analyzing-text">작품을 불러오는 중...</h2>
            <p className="analyzing-sub">잠시만 기다려주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="pref-page">
        <div className="pref-container">
          <div className="pref-analyzing fade-in">
            <h2 className="analyzing-text">작품을 불러오지 못했습니다</h2>
            <p className="analyzing-sub" style={{ whiteSpace: "pre-line" }}>
              {errorMsg || "잠시 후 다시 시도해주세요."}
            </p>
            <div className="result-actions" style={{ marginTop: 16 }}>
              <button className="pref-btn-secondary" onClick={() => window.location.reload()}>
                새로고침
              </button>
              <button className="pref-btn-primary" onClick={() => navigate("/preference")}>
                처음으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 잘못 진입(라운드 없음)
  if (!round) {
    navigate("/preference", { replace: true });
    return null;
  }

  const total = rounds.length;
  const leftSrc = resolveMediaUrl(round.left.imageUrl);
  const rightSrc = resolveMediaUrl(round.right.imageUrl);

  const handleSelect = (choice: "left" | "right") => {
    const picked = choice === "left" ? round.left : round.right;

    addSelection({
      round: round.round,
      artworkId: picked.artworkId,
      selectedId: String(picked.artworkId),
      type: round.genreName,
      genreId: round.genreId,
      genreName: round.genreName,
      tags: picked.tags,
    });

    if (currentRoundIdx < total - 1) {
      window.setTimeout(() => setRoundIdx(currentRoundIdx + 1), 250);
    } else {
      navigate("/preference/result");
    }
  };

  return (
    <div className="pref-page">
      <div className="pref-container">
        <div className="pref-battle fade-in">
          <div className="battle-header">
            <span className="battle-round">
              ROUND {currentRoundIdx + 1} / {total}
            </span>
            <h2 className="battle-title">어느 쪽이 더 끌리나요?</h2>

            {/* ✅ 장르명 표시(원하면 삭제) */}
            <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
              {round.genreName}
            </p>
          </div>

          <div className="battle-arena">
            <div className="battle-card" onClick={() => handleSelect("left")}>
              <img src={leftSrc} alt="Left Option" />
              <div className="battle-overlay">SELECT</div>

              {/* ✅ tags 표시(원하면 삭제) */}
              {round.left.tags?.length > 0 && (
                <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {round.left.tags.slice(0, 3).map((t) => (
                    <span key={t} style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="battle-vs">VS</div>

            <div className="battle-card" onClick={() => handleSelect("right")}>
              <img src={rightSrc} alt="Right Option" />
              <div className="battle-overlay">SELECT</div>

              {round.right.tags?.length > 0 && (
                <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {round.right.tags.slice(0, 3).map((t) => (
                    <span key={t} style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
