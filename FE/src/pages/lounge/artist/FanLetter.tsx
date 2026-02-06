// FE/src/pages/lounge/artist/FanLetter.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./fanLetter.css";
import "../../../pages/fanLetter/NewFanLetter.css";

import { useAuthStore } from "../../../features/auth/store";
import type { FanLetter as FanLetterModel } from "../../../features/fanLetter/types";
import {
  fetchArtistFanLetters,
  createFanLetterAnswer,
  updateFanLetterAnswer,
  deleteFanLetterAnswer,
} from "../../../features/fanLetter/api";

type FanLetterFilter = "all" | "unanswered" | "answered";
type ReplyMode = "create" | "edit";

function formatDate(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function FanLetter() {
  const user = useAuthStore((s) => s.user);

  const roleRaw = useAuthStore((s) => s.role);
  const roleNorm = String(roleRaw ?? "").toLowerCase();

  const artistMemberUuid = user?.memberUuid ?? "";

  const [items, setItems] = useState<FanLetterModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FanLetterFilter>("unanswered");

  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>("create");
  const [answerText, setAnswerText] = useState("");
  const [sending, setSending] = useState(false);

  const canUse = roleNorm === "artist" && Boolean(artistMemberUuid);

  const refetch = useCallback(async () => {
    if (!artistMemberUuid) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchArtistFanLetters(artistMemberUuid);
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
      alert("팬레터 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [artistMemberUuid]);

  useEffect(() => {
    if (!canUse) {
      return;
    }
    void refetch();
  }, [canUse, refetch]);

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? items
        : filter === "answered"
          ? items.filter((x) => x.isAnswered)
          : items.filter((x) => !x.isAnswered);

    return [...base].sort((a, b) => {
      if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [items, filter]);

  const openCreate = (id: number) => {
    setReplyingId(id);
    setReplyMode("create");
    setAnswerText("");
  };

  const openEdit = (id: number, currentAnswer?: string) => {
    setReplyingId(id);
    setReplyMode("edit");
    setAnswerText(currentAnswer ?? "");
  };

  const closeReply = () => {
    if (sending) return;
    setReplyingId(null);
    setAnswerText("");
    setReplyMode("create");
  };

  const submitAnswer = async () => {
    if (replyingId == null) return;

    const txt = answerText.trim();
    if (!txt) return alert("답변 내용을 입력해주세요.");

    setSending(true);
    try {
      if (replyMode === "create") {
        await createFanLetterAnswer(replyingId, txt);
        alert("답변이 등록되었습니다.");
      } else {
        await updateFanLetterAnswer(replyingId, txt);
        alert("답변이 수정되었습니다.");
      }

      closeReply();
      await refetch();
    } catch (e) {
      console.error(e);
      alert(replyMode === "create" ? "답변 등록에 실패했습니다." : "답변 수정에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  const removeAnswer = async () => {
    if (replyingId == null) return;
    if (!confirm("답변을 삭제할까요?")) return;

    setSending(true);
    try {
      await deleteFanLetterAnswer(replyingId);
      alert("답변이 삭제되었습니다.");
      closeReply();
      await refetch();
    } catch (e) {
      console.error(e);
      alert("답변 삭제에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!canUse) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Fan Letters</h1>
        <div style={{ opacity: 0.8 }}>작가 계정에서만 접근할 수 있습니다.</div>
      </main>
    );
  }

  return (
    <main className="fanletterPage">
      <header className="fanletterHeader">
        <h1 className="fanletterTitle">Fan Letters</h1>
        <div className="filters">
          <button
            type="button"
            className={`filterBtn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`filterBtn ${filter === "unanswered" ? "active" : ""}`}
            onClick={() => setFilter("unanswered")}
          >
            Unanswered
          </button>
          <button
            type="button"
            className={`filterBtn ${filter === "answered" ? "active" : ""}`}
            onClick={() => setFilter("answered")}
          >
            Answered
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 24, opacity: 0.8 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 24, opacity: 0.8 }}>팬레터가 없습니다.</div>
      ) : (
        <section className="fanletter-card-list">
          {filtered.map((fl) => (
            <div key={fl.id} className={`card fanletter-card ${fl.isAnswered ? "answered" : ""}`}>
                <div className="card__hero">
                    <div className="card__hero-header">
                        <span>From. {fl.fromNickname}</span>
                        <span>{formatDate(fl.createdAt)}</span>
                    </div>
                    {fl.artworkName && <div className="fanletter-artwork-name">🎨 {fl.artworkName}</div>}
                </div>
              
                <div className="card__body">
                    <p className="fanletter-question">{fl.question}</p>
                    {fl.isAnswered && fl.answer && (
                    <div className="fanletter-answer">
                        <div className="fanletter-answer-label">Answer</div>
                        <div className="fanletter-answer-text">{fl.answer}</div>
                    </div>
                    )}
                </div>

                <div className="card__footer">
                    {!fl.isAnswered ? (
                    <button type="button" className="card__btn" onClick={() => openCreate(fl.id)}>
                        Reply
                    </button>
                    ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button type="button" className="card__btn" onClick={() => openEdit(fl.id, fl.answer)}>
                        Edit
                        </button>

                        <button
                        type="button"
                        className="card__btn danger"
                        onClick={async () => {
                            if (!confirm("답변을 삭제할까요?")) return;
                            setSending(true);
                            try {
                            await deleteFanLetterAnswer(fl.id);
                            alert("답변이 삭제되었습니다.");
                            await refetch();
                            } catch (e) {
                            console.error(e);
                            alert("답변 삭제에 실패했습니다.");
                            } finally {
                            setSending(false);
                            }
                        }}
                        disabled={sending}
                        >
                        Delete
                        </button>
                        <span className="fanletter-badge">Answered</span>
                    </div>
                    )}
                </div>
            </div>
          ))}
        </section>
      )}

      {/* Reply/Edit Modal */}
      {replyingId !== null && (
        <div className="replyBackdrop" onMouseDown={closeReply}>
          <div className="replyModal" onMouseDown={(e) => e.stopPropagation()}>
            <header className="replyHeader">
              <div className="replyTitle">{replyMode === "create" ? "Write Answer" : "Edit Answer"}</div>
              <button type="button" className="replyX" onClick={closeReply} disabled={sending}>
                ✕
              </button>
            </header>

            <div className="replyBody">
              <textarea
                className="replyTextarea"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={8}
                placeholder="팬레터에 대한 답변을 작성하세요."
              />
            </div>

            <footer className="replyFooter">
              <button type="button" className="replyBtn ghost" onClick={closeReply} disabled={sending}>
                Cancel
              </button>

              {replyMode === "edit" && (
                <button type="button" className="replyBtn ghost" onClick={removeAnswer} disabled={sending}>
                  Delete
                </button>
              )}

              <button
                type="button"
                className="replyBtn primary"
                onClick={submitAnswer}
                disabled={sending || !answerText.trim()}
              >
                {sending ? "Saving..." : "Save"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
