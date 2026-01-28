// FE/src/pages/yourpreference/views/Battle.tsx
import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadSession, saveSession } from "../store/session";
import { createInitialSession, ensureCurrentPair, nextPairAfterPick } from "../logic/engine";
import "../yourtaste.css";

const BASE = "/yourtaste"; // ✅ 여기만 바꾸면 전체 경로 통일 가능

export default function Battle() {
  const nav = useNavigate();
  const raw = loadSession() as any;

  // ✅ 세션 없으면 자동으로 생성해서 바로 배틀 시작
  useEffect(() => {
    if (!raw) {
      const init = createInitialSession({ totalRounds: 8 });
      saveSession(init);
      // replace로 깔끔하게
      nav(`${BASE}/battle`, { replace: true });
    }
  }, [raw, nav]);

  // raw가 아직 없을 때도 "빈 화면" 대신 최소 UI 표시
  if (!raw) {
    return (
      <main className="ytFullBleed ytBattlePage">
        <div className="ytBattleShell ytEmptyState">
          <h1 className="ytBattleTitle">블라인드 취향 분석</h1>
          <p className="ytBattleSub">세션을 준비 중입니다…</p>
        </div>
      </main>
    );
  }

  // ✅ pair가 없으면 강제로 생성 (세션 깨짐 방어)
  const session = useMemo(() => ensureCurrentPair(raw), [raw]);
  useEffect(() => {
    // ensureCurrentPair가 새 객체를 반환한 경우만 저장
    if (session !== raw) saveSession(session as any);
  }, [session, raw]);

  const left = (session as any).currentPair?.left;
  const right = (session as any).currentPair?.right;

  const round = (session as any).round ?? 1;
  const total = (session as any).totalRounds ?? 8;
  const progress = Math.max(0, Math.min(100, ((round - 1) / total) * 100));

  const onPick = (pickedId: string) => {
    const next = nextPairAfterPick(session as any, pickedId) as any;
    saveSession(next);

    if (next.done) nav(`${BASE}/analysis`);
    else nav(`${BASE}/battle`);
  };

  // ✅ left/right가 끝까지 없으면, 그래도 화면은 떠야 함(빈 화면 방지)
  if (!left || !right) {
    return (
      <main className="ytFullBleed ytBattlePage">
        <div className="ytBattleShell ytEmptyState">
          <h1 className="ytBattleTitle">블라인드 취향 분석</h1>
          <p className="ytBattleSub">표시할 작품 pair가 없습니다. 세션을 새로 시작해 주세요.</p>
          <div className="ytRow">
            <button
              className="ytBtn ytBtnPrimary"
              onClick={() => {
                const init = createInitialSession({ totalRounds: 8 });
                saveSession(init);
                nav(`${BASE}/battle`, { replace: true });
              }}
            >
              다시 시작
            </button>
            <Link className="ytBtn" to={`${BASE}`}>
              인트로로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ytFullBleed ytBattlePage">
      <div className="ytBattleShell">
        <header className="ytBattleTop">
          <div className="ytBattleHead">
            <h1 className="ytBattleTitle">블라인드 취향 분석</h1>
            <div className="ytBattleSub">두 작품 중 더 끌리는 쪽을 선택하세요.</div>
          </div>

          <div className="ytBattleMeta">
            <div className="ytMetaText">
              {round} / {total}
            </div>
            <div className="ytProgressTrack" aria-label="progress">
              <div className="ytProgressFill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <section className="ytBattleGrid">
          <button className="ytChoiceBtn" type="button" onClick={() => onPick(left.id)}>
            <div className="ytChoiceCard">
              <img className="ytChoiceImg" src={left.imageUrl} alt="left artwork" loading="eager" />
              <div className="ytChoiceOverlay">선택</div>
            </div>
          </button>

          <button className="ytChoiceBtn" type="button" onClick={() => onPick(right.id)}>
            <div className="ytChoiceCard">
              <img className="ytChoiceImg" src={right.imageUrl} alt="right artwork" loading="eager" />
              <div className="ytChoiceOverlay">선택</div>
            </div>
          </button>
        </section>
      </div>
    </main>
  );
}
