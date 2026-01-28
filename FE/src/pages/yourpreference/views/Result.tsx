// src/pages/yourpreference/views/Result.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadSession, clearSession } from "../store/session";
import { mockArtworks } from "../data/mockArtworks";

import "../yourtaste.css";


export default function Result() {
  const nav = useNavigate();
  const session = loadSession() as any;

  if (!session) {
    nav("/artist-go", { replace: true });
    return null;
  }

  // ✅ 엔진 결과 구조에 맞춰 매핑만 맞추면 됨
  const result = session.result ?? session.analysis ?? {};
  const typeCode = result.typeCode ?? result.type ?? "UNKNOWN";
  const summary = result.summary ?? "당신의 선택 패턴을 바탕으로 취향 타입을 도출했어요.";

  // 축 점수(0~100 가정). 네 결과가 0~1이면 *100 하면 됨.
  const axes = useMemo(() => {
    const axisScores = result.axisScores ?? result.axes ?? null;
    if (!axisScores) return [];
    const list = Array.isArray(axisScores)
      ? axisScores
      : Object.entries(axisScores).map(([k, v]) => ({ key: k, value: v }));
    return list.map((a: any) => ({
      key: a.key ?? a.axis ?? "AXIS",
      left: a.leftLabel ?? "A",
      right: a.rightLabel ?? "B",
      value: typeof a.value === "number" ? a.value : typeof a.score === "number" ? a.score : 50,
    }));
  }, [result]);

  // 선택한 작품들 썸네일(세션에 pickedIds가 없으면 history에서 뽑기)
  const pickedIds: string[] =
    session.pickedIds ??
    session.picks?.map((p: any) => p.pickedId) ??
    session.history?.map((h: any) => h.pickedId) ??
    [];

  const picked = pickedIds
    .map((id) => mockArtworks.find((a: any) => a.id === id))
    .filter(Boolean) as any[];

  const restart = () => {
    clearSession();
    nav("/artist-go", { replace: true });
  };

  const copy = async () => {
    const text = `ARNNECT 블라인드 취향 분석 결과: ${typeCode}\n${summary}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("결과가 복사되었습니다.");
    } catch {
      alert("복사에 실패했습니다. (브라우저 권한 확인)");
    }
  };

  return (
    <main className="ytFullBleed">
      <div className="ytResultWrap">
        <header className="ytResultHeader">
          <div>
            <h1 className="ytResultTitle">분석 결과</h1>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              선택 기록 기반으로 취향 타입을 도출했어요.
            </div>
          </div>
          <div className="ytResultType">{typeCode}</div>
        </header>

        <div className="ytGrid2">
          <section className="ytCard">
            <div style={{ fontWeight: 900, fontSize: 14 }}>요약</div>
            <div style={{ marginTop: 8, lineHeight: 1.55, opacity: 0.85 }}>{summary}</div>

            {!!axes.length && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>취향 축</div>

                {axes.slice(0, 4).map((a: any, idx: number) => {
                  const v = Math.max(0, Math.min(100, a.value));
                  return (
                    <div key={a.key + idx} className="ytAxisRow">
                      <div className="ytAxisLabel">{a.left}</div>
                      <div className="ytAxisTrack">
                        <div className="ytAxisFill" style={{ width: `${v}%` }} />
                      </div>
                      <div className="ytAxisLabel" style={{ textAlign: "right" }}>
                        {a.right}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ytCard">
            <div style={{ fontWeight: 900, fontSize: 14 }}>이번에 고른 작품</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              선택 결과를 기반으로 다음 회차 개인화에 활용할 수 있어요.
            </div>

            {picked.length ? (
              <div className="ytPickedGrid">
                {picked.slice(0, 12).map((a: any) => (
                  <div key={a.id} className="ytPickedThumb">
                    <img src={a.imageUrl} alt={a.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                선택 기록이 없습니다. (세션 저장 로직 확인)
              </div>
            )}

            <div className="ytActions">
              <button className="ytBtn" type="button" onClick={copy}>
                결과 복사
              </button>
              <button className="ytBtn" type="button" onClick={() => nav("/feed")}>
                홈
              </button>
              <button className="ytBtn ytBtnPrimary" type="button" onClick={restart}>
                다시하기
              </button>
            </div>
          </section>
        </div>

        <section className="ytCard">
          <div style={{ fontWeight: 900, fontSize: 14 }}>다음 단계(발표용 포인트)</div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.6, opacity: 0.85 }}>
            <li>선택 로그 저장(세션/유저별) → 2회차부터 개인화 후보 섞기</li>
            <li>AI 임베딩 기반 유사작 추천으로 “비슷한 결” 재노출</li>
            <li>결과 타입별 추천 피드/작가 연결</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

