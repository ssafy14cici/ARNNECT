// FE/src/pages/lounge/artist/FanLetter.tsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../lounge.css";

import type {
  FanLetter,
  FanLetterFilter,
  FanLetterViewMode,
} from "../../../features/fanLetter/types";
import {
  createFanLetterAnswer,
  deleteFanLetterAnswer,
  fetchArtistFanLetters,
  updateFanLetterAnswer,
} from "../../../features/fanLetter/api";
import { useAuthStore } from "../../../features/auth/store";

// AuthStore 타입 정의 (any 제거용)
interface AuthState {
  memberUuid?: string;
  me?: { memberUuid: string };
  user?: { memberUuid: string };
  profile?: { memberUuid: string };
}

function toMillis(dateStr: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map((v) => Number(v));
    return new Date(y, m - 1, d).getTime();
  }
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

// fmt 함수 사용 (날짜 표시용)
function fmt(dateStr: string): string {
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

  const auth = useAuthStore((s) => s) as AuthState;
  const artistUuidFromStore =
    auth?.memberUuid ??
    auth?.me?.memberUuid ??
    auth?.user?.memberUuid ??
    auth?.profile?.memberUuid ??
    null;

  const artistUuid = (searchParams.get("artist") || artistUuidFromStore) as string | null;

  const [items, setItems] = useState<FanLetter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<FanLetterViewMode>("postit");
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
  }, [selected?.id]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = items.filter((it) => {
      if (filter === "unanswered" && it.isAnswered) return false;
      if (filter === "answered" && !it.isAnswered) return false;

      if (!q) return true;
      const hay = `${it.question} ${it.fromNickname} ${it.artworkName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

    return filtered.sort((a, b) => {
      if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
      return toMillis(b.createdAt) - toMillis(a.createdAt);
    });
  }, [items, filter, query]);

  const refresh = useCallback(async () => {
    if (!artistUuid) {
      setError("artist UUID를 찾지 못했습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await fetchArtistFanLetters(artistUuid);
      setItems(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [artistUuid, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSaveAnswer() {
    if (!selected) return;

    const trimmed = draftAnswer.trim();
    if (!trimmed) {
      alert("답변 내용을 입력해 주세요.");
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

      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id ? { ...it, isAnswered: true, answer: trimmed } : it
        )
      );
      alert("답변이 저장되었습니다.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAnswer() {
    if (!selected || !selected.isAnswered) return;
    if (!window.confirm("답변을 삭제하시겠습니까?")) return;

    setSaving(true);
    setError(null);

    try {
      await deleteFanLetterAnswer(selected.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id ? { ...it, isAnswered: false, answer: undefined } : it
        )
      );
      setDraftAnswer("");
      alert("답변이 삭제되었습니다.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "삭제에 실패했습니다.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const empty = filteredSorted.length === 0 && !loading;

  const postitCardStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 2,
    padding: "20px",
    cursor: "pointer",
    background: active ? "#fff" : "rgba(255,255,255,0.9)",
    color: "#000",
    boxShadow: active ? "0 20px 40px rgba(0,0,0,0.5)" : "0 5px 15px rgba(0,0,0,0.3)",
    transform: active ? "scale(1.02) rotate(-1deg)" : "rotate(0deg)",
    transition: "all 0.3s ease",
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
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

        <p className="loungeSubDesc">관객들의 소중한 메시지와 질문을 확인하세요.</p>

        {/* Controls Panel */}
        <div className="loungeSubPanel" style={{ padding: 20, marginBottom: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`loungeSubBtn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>전체</button>
              <button className={`loungeSubBtn ${filter === "unanswered" ? "active" : ""}`} onClick={() => setFilter("unanswered")}>미답변</button>
              {/* 검색어 입력창 추가 (setQuery 사용) */}
              <input 
                type="text" 
                placeholder="검색..." 
                className="loungeInput" 
                style={{ width: 150, padding: "4px 12px" }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className={`loungeSubBtn ${viewMode === "postit" ? "active" : ""}`} onClick={() => setViewMode("postit")}>포스트잇</button>
              <button className={`loungeSubBtn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>리스트</button>
            </div>
          </div>
          {error && <p style={{ color: "#ff6b6b", marginTop: 10, fontSize: "0.85rem" }}>{error}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          {/* Left: Message List */}
          <div>
            <h2 className="loungeSubPanelTitle">Messages ({filteredSorted.length})</h2>
            {loading && <div className="loungeEmpty">불러오는 중...</div>}
            {empty && <div className="loungeEmpty">도착한 메시지가 없습니다.</div>}

            {!empty && viewMode === "postit" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {filteredSorted.map((it) => (
                  <div key={it.id} style={postitCardStyle(it.id === selectedId)} onClick={() => setSelectedId(it.id)}>
                    <div style={{ fontSize: "0.9rem", marginBottom: 10, wordBreak: "break-all" }}>{it.question}</div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#888" }}>{fmt(it.createdAt)}</div>
                      <div style={{ fontSize: "0.8rem", color: "#666", textAlign: "right" }}>- {it.fromNickname ?? "익명"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!empty && viewMode === "list" && (
              <div className="loungeList">
                {filteredSorted.map((it) => (
                  <div key={it.id} className={`loungeListItem ${it.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(it.id)}>
                    <span className="q-text">{it.question}</span>
                    <span className="q-date">{fmt(it.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detail & Answer */}
          <div style={{ position: "sticky", top: 120, height: "fit-content" }}>
            <div className="loungeSubPanel" style={{ textAlign: "left" }}>
              <h2 className="loungeSubPanelTitle">Reply</h2>
              {selected ? (
                <>
                  <div style={{ marginBottom: 20, padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                    <div style={{ color: "#C8A97E", fontSize: "0.8rem", marginBottom: 4 }}>DATE: {fmt(selected.createdAt)}</div>
                    <div style={{ color: "#C8A97E", fontSize: "0.9rem", marginBottom: 8 }}>FROM: {selected.fromNickname}</div>
                    <div style={{ fontSize: "1.1rem", lineHeight: 1.5 }}>{selected.question}</div>
                  </div>

                  <textarea
                    className="loungeInput"
                    value={draftAnswer}
                    onChange={(e) => setDraftAnswer(e.target.value)}
                    rows={6}
                    placeholder="답장을 작성해주세요..."
                    style={{ background: "transparent", width: "100%", resize: "none", border: "1px solid rgba(255,255,255,0.2)", padding: 12 }}
                  />

                  <div className="loungeSubActions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="loungeSubBtn active" onClick={onSaveAnswer} disabled={saving}>
                      {saving ? "처리 중..." : selected.isAnswered ? "수정하기" : "보내기"}
                    </button>
                    {selected.isAnswered && (
                      <button className="loungeSubBtn" onClick={onDeleteAnswer} disabled={saving} style={{ color: "#ff6b6b" }}>
                        삭제
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="loungeEmpty" style={{ padding: "40px 0" }}>메시지를 선택해주세요.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}