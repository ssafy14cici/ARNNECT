// FE/src/pages/lounge/artist/FanLetter.tsx
import { useEffect, useMemo, useState } from "react";
import "./fanLetter.css";

import { useAuthStore } from "../../../features/auth/store";
import type { FanLetter as FanLetterModel } from "../../../features/fanLetter/types";
import {
  fetchArtistFanLetters,
  createFanLetterAnswer,
  updateFanLetterAnswer,
  deleteFanLetterAnswer,
} from "../../../features/fanLetter/api";

type FanLetterViewMode = "postit" | "list";
type FanLetterFilter = "all" | "unanswered" | "answered";
type ReplyMode = "create" | "edit";

function formatDate(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function FanLetter() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role); // "general" | "artist" | null

  const artistMemberUuid = user?.memberUuid ?? "";

  const [items, setItems] = useState<FanLetterModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<FanLetterViewMode>("postit");
  const [filter, setFilter] = useState<FanLetterFilter>("unanswered");

  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>("create");
  const [answerText, setAnswerText] = useState("");
  const [sending, setSending] = useState(false);

  const canUse = role === "artist" && Boolean(artistMemberUuid);

  const refetch = async () => {
    if (!artistMemberUuid) return;
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
  };

  useEffect(() => {
    if (!canUse) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistMemberUuid, canUse]);

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? items
        : filter === "answered"
          ? items.filter((x) => x.isAnswered)
          : items.filter((x) => !x.isAnswered);

    // ✅ 미답변 우선 + 최신순
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
        <h1 style={{ marginBottom: 8 }}>Fan Letters</h1>
        <div style={{ opacity: 0.8 }}>작가 계정에서만 접근할 수 있습니다.</div>
      </main>
    );
  }

  return (
    <main className="fanletterPage">
      <header className="fanletterHeader">
        <h1 className="fanletterTitle">Fan Letters</h1>

        <div className="fanletterControls">
          <div className="pill">
            <button
              type="button"
              className={`pillBtn ${viewMode === "postit" ? "active" : ""}`}
              onClick={() => setViewMode("postit")}
            >
              Post-it
            </button>
            <button
              type="button"
              className={`pillBtn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>

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
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 24, opacity: 0.8 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 24, opacity: 0.8 }}>팬레터가 없습니다.</div>
      ) : (
        <section className={viewMode === "postit" ? "fanletterGrid" : "fanletterList"}>
          {filtered.map((fl) => (
            <article key={fl.id} className={`flCard ${fl.isAnswered ? "answered" : "unanswered"}`}>
              <div className="flTop">
                <div className="flFrom">{fl.fromNickname}</div>
                <div className="flDate">{formatDate(fl.createdAt)}</div>
              </div>

              <div className="flBody">
                {fl.artworkName && <div className="flArtwork">🎨 {fl.artworkName}</div>}
                <div className="flQuestion">{fl.question}</div>

                {fl.isAnswered && fl.answer && (
                  <div className="flAnswer">
                    <div className="flAnswerLabel">Answer</div>
                    <div className="flAnswerText">{fl.answer}</div>
                  </div>
                )}
              </div>

              <div className="flActions">
                {!fl.isAnswered ? (
                  <button type="button" className="flBtn primary" onClick={() => openCreate(fl.id)}>
                    Reply
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="flBtn"
                      onClick={() => openEdit(fl.id, fl.answer)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flBtn danger"
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
                    <span className="flBadge">Answered</span>
                  </div>
                )}
              </div>
            </article>
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
                <button
                  type="button"
                  className="replyBtn ghost"
                  onClick={removeAnswer}
                  disabled={sending}
                >
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
