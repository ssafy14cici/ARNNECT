import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../lounge.css";

import type { FanLetter, FanLetterFilter, FanLetterViewMode } from "../../../types/fanLetter";
import {
  createFanLetterAnswer,
  deleteFanLetterAnswer,
  fetchArtistFanLetters,
  updateFanLetterAnswer,
} from "../../../api/fanLetter";

import { useAuthStore } from "../../../stores/authStore";

function toMillis(dateStr: string): number {
  // API: "yyyy-MM-dd" 형태가 기본. ISO도 들어올 수 있으니 둘 다 방어.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map((v) => Number(v));
    return new Date(y, m - 1, d).getTime();
  }
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

function fmt(dateStr: string): string {
  // yyyy-MM-dd는 그대로 노출, ISO면 간단 표시
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.replaceAll("-", ".");
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return dateStr;
  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export default function FanLetter() {
  const [searchParams] = useSearchParams();

  // authStore 구조가 프로젝트마다 달라서 최대한 안전하게 꺼냄
  const auth = useAuthStore((s: any) => s);
  const artistUuidFromStore =
    auth?.memberUuid ?? auth?.me?.memberUuid ?? auth?.user?.memberUuid ?? auth?.profile?.memberUuid ?? null;

  // 디버깅/개발 중엔 ?artist=UUID 로도 주입 가능하게 (store 없을 때 대비)
  const artistUuid = (searchParams.get("artist") || artistUuidFromStore) as string | null;

  const [items, setItems] = useState<FanLetter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<FanLetterViewMode>("postit"); // default: 포스트잇
  const [filter, setFilter] = useState<FanLetterFilter>("all");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const [draftAnswer, setDraftAnswer] = useState("");

  useEffect(() => {
    if (!selected) {
      setDraftAnswer("");
      return;
    }
    setDraftAnswer(selected.answer ?? "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = items.filter((it) => {
      if (filter === "unanswered" && it.isAnswered) return false;
      if (filter === "answered" && !it.isAnswered) return false;

      if (!q) return true;
      const hay = `${it.question} ${it.fromNickname} ${it.artworkName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

    // 미답변 우선 + 최신순
    return filtered.sort((a, b) => {
      if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
      return toMillis(b.createdAt) - toMillis(a.createdAt);
    });
  }, [items, filter, query]);

  async function refresh() {
    if (!artistUuid) {
      setError("artist UUID를 찾지 못했습니다. (authStore 또는 ?artist=UUID 확인)");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await fetchArtistFanLetters(artistUuid);
      setItems(list);
      setSelectedId((prev) => prev ?? (list[0]?.id ?? null));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistUuid]);

  async function onSaveAnswer() {
    if (!selected) return;

    const trimmed = draftAnswer.trim();
    if (!trimmed) {
      setError("답변 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (selected.isAnswered) {
        await updateFanLetterAnswer(selected.id, trimmed);
      } else {
        await createFanLetterAnswer(selected.id, trimmed);
      }

      // 명세상 답장 API 응답에 data가 없으므로, 로컬 업데이트 후 필요 시 재조회
      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id ? { ...it, isAnswered: true, answer: trimmed } : it,
        ),
      );
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAnswer() {
    if (!selected) return;
    if (!selected.isAnswered) return;

    setSaving(true);
    setError(null);

    try {
      await deleteFanLetterAnswer(selected.id);

      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id ? { ...it, isAnswered: false, answer: undefined } : it,
        ),
      );
      setDraftAnswer("");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const empty = filteredSorted.length === 0 && !loading;

  // 간단 post-it 스타일(별도 css 파일 없이 최소)
  const postitGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  };

  const postitCardStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 14,
    padding: "14px 14px 12px",
    cursor: "pointer",
    background: "#fff3a5",
    color: "#1b1b1b",
    boxShadow: active ? "0 14px 34px rgba(0,0,0,0.30)" : "0 10px 26px rgba(0,0,0,0.22)",
    outline: active ? "3px solid rgba(255,255,255,0.55)" : "none",
    border: "1px solid rgba(0,0,0,0.08)",
    transform: active ? "scale(1.01)" : "none",
  });

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">팬레터 · QnA</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">받은 질문을 확인하고 답변을 관리합니다.</p>

        {/* Controls */}
        <div className="loungeSubPanel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "inline-flex", gap: 6 }}>
              <button
                type="button"
                className="loungeSubBtn"
                onClick={() => setViewMode("postit")}
                style={{ opacity: viewMode === "postit" ? 1 : 0.7 }}
              >
                포스트잇
              </button>
              <button
                type="button"
                className="loungeSubBtn"
                onClick={() => setViewMode("list")}
                style={{ opacity: viewMode === "list" ? 1 : 0.7 }}
              >
                리스트
              </button>
            </div>

            <div style={{ display: "inline-flex", gap: 6 }}>
              <button
                type="button"
                className="loungeSubBtn"
                onClick={() => setFilter("all")}
                style={{ opacity: filter === "all" ? 1 : 0.7 }}
              >
                전체
              </button>
              <button
                type="button"
                className="loungeSubBtn"
                onClick={() => setFilter("unanswered")}
                style={{ opacity: filter === "unanswered" ? 1 : 0.7 }}
              >
                미답변
              </button>
              <button
                type="button"
                className="loungeSubBtn"
                onClick={() => setFilter("answered")}
                style={{ opacity: filter === "answered" ? 1 : 0.7 }}
              >
                답변완료
              </button>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색(닉네임/내용/작품)"
              style={{
                minWidth: 240,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.18)",
                color: "rgba(255,255,255,0.9)",
                outline: "none",
              }}
            />
          </div>

          <div className="loungeSubActions" style={{ margin: 0 }}>
            <button className="loungeSubBtn" type="button" onClick={refresh} disabled={loading}>
              {loading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
          {/* List */}
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">받은 질문</h2>

            {empty && <div className="loungeEmpty">도착한 질문이 없습니다.</div>}

            {!empty && viewMode === "postit" && (
              <div style={postitGridStyle}>
                {filteredSorted.map((it) => {
                  const active = it.id === selectedId;
                  return (
                    <div key={it.id} style={postitCardStyle(active)} onClick={() => setSelectedId(it.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                        <span>{it.fromNickname ?? "익명"}</span>
                        <span>{fmt(it.createdAt)}</span>
                      </div>

                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                        {it.question}
                      </p>

                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "5px 8px",
                            borderRadius: 999,
                            background: it.isAnswered ? "rgba(0,0,0,0.08)" : "rgba(255,75,75,0.16)",
                          }}
                        >
                          {it.isAnswered ? "답변완료" : "미답변"}
                        </span>
                        {it.artworkName && (
                          <span style={{ fontSize: 12, padding: "5px 8px", borderRadius: 999, background: "rgba(0,0,0,0.08)" }}>
                            {it.artworkName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!empty && viewMode === "list" && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", width: 90 }}>상태</th>
                      <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>질문</th>
                      <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", width: 140 }}>닉네임</th>
                      <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", width: 120 }}>일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map((it) => {
                      const active = it.id === selectedId;
                      return (
                        <tr
                          key={it.id}
                          onClick={() => setSelectedId(it.id)}
                          style={{ cursor: "pointer", background: active ? "rgba(255,255,255,0.06)" : "transparent" }}
                        >
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                            {it.isAnswered ? "완료" : "미답변"}
                          </td>
                          <td
                            style={{
                              padding: "10px 8px",
                              borderBottom: "1px solid rgba(255,255,255,0.12)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 420,
                            }}
                            title={it.question}
                          >
                            {it.question}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                            {it.fromNickname}
                          </td>
                          <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                            {fmt(it.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,110,110,0.95)" }}>
                {error}
              </div>
            )}
          </div>

          {/* Detail / Answer */}
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">상세 · 답변</h2>

            {!selected && <div className="loungeEmpty">왼쪽에서 질문을 선택해 주세요.</div>}

            {selected && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      {selected.fromNickname ?? "익명"}님의 질문
                    </h3>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
                      수신: {fmt(selected.createdAt)}
                      {selected.artworkName ? ` · 작품: ${selected.artworkName}` : ""}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    {selected.isAnswered ? "답변완료" : "미답변"}
                  </span>
                </div>

                <div
                  style={{
                    margin: "10px 0 14px",
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.18)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selected.question}
                </div>

                <textarea
                  value={draftAnswer}
                  onChange={(e) => setDraftAnswer(e.target.value)}
                  placeholder="답변을 작성하세요."
                  style={{
                    width: "100%",
                    minHeight: 160,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.18)",
                    color: "rgba(255,255,255,0.9)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                <div className="loungeSubActions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    className="loungeSubBtn"
                    type="button"
                    onClick={() => setDraftAnswer(selected.answer ?? "")}
                    disabled={saving}
                  >
                    원래대로
                  </button>

                  {selected.isAnswered && (
                    <button
                      className="loungeSubBtn"
                      type="button"
                      onClick={onDeleteAnswer}
                      disabled={saving}
                      style={{ opacity: 0.9 }}
                    >
                      답변 삭제
                    </button>
                  )}

                  <button className="loungeSubBtn" type="button" onClick={onSaveAnswer} disabled={saving}>
                    {saving ? "저장 중..." : selected.isAnswered ? "답변 수정" : "답변 등록"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Responsive: 좁은 화면에서는 1열로 */}
        <style>
          {`
            @media (max-width: 980px) {
              .loungeWrap > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
            }
          `}
        </style>
      </section>
    </main>
  );
}
