// FE/src/pages/reviews/detail/CommentThread.tsx
import { useEffect, useMemo, useState } from "react";
import { safeToInt } from "../../artworks/detail/utils";
import type { UiComment } from "./types";
import type { LocalComment } from "./mappers";
import { createReviewComment, deleteComment, fetchReviewComments, updateComment } from "./api";
import "./commentThread.css";

type Props = {
  reviewId?: number;
  isLoggedIn: boolean;
  meUuid: string; // String(user?.memberUuid)
  myDisplayName: string; // user?.name fallback 포함
};

export default function CommentThread({ reviewId, isLoggedIn, meUuid, myDisplayName }: Props) {
  const [comments, setComments] = useState<UiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const [replyingParentId, setReplyingParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  /** ✅ uuid가 안 내려오는 서버도 있어서 "이름 매칭" fallback을 추가(서버가 최종 권한 검증) */
  const withMine = (list: LocalComment[]): UiComment[] => {
    const me = String(meUuid ?? "").trim();
    const myName = String(myDisplayName ?? "").trim();

    return list.map((c) => {
      const authorUuid = String(c.authorUuid ?? "").trim();
      const authorName = String(c.authorName ?? "").trim();

      const mineByUuid = !!me && !!authorUuid && authorUuid === me;
      const mineByName = !authorUuid && !!myName && !!authorName && authorName === myName;

      return {
        ...c,
        isMine: mineByUuid || mineByName,
      };
    });
  };

  const rootComments = useMemo(() => comments.filter((c) => c.parentId == null), [comments]);

  const repliesByParent = useMemo(() => {
    const m = new Map<string, UiComment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const list = m.get(String(c.parentId)) ?? [];
      list.push(c);
      m.set(String(c.parentId), list);
    }
    return m;
  }, [comments]);

  const refetchComments = async () => {
    if (!reviewId || !Number.isFinite(reviewId)) return;

    setCommentsLoading(true);
    try {
      const list = await fetchReviewComments(reviewId);
      setComments(withMine(list));
      setCommentsError(null);
    } catch (e) {
      console.error(e);
      setComments([]);
      setCommentsError("댓글을 불러오지 못했습니다.");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    setComments([]);
    setCommentsError(null);
    setEditingId(null);
    setEditingText("");
    setReplyingParentId(null);
    setReplyText("");

    if (!reviewId || !Number.isFinite(reviewId)) return;
    refetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, meUuid, myDisplayName]);

  const onSubmitComment = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!reviewId || !Number.isFinite(reviewId)) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;

    const tempId = `temp-${crypto.randomUUID()}`;

    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        parentId: null,
        content: trimmed,
        authorUuid: meUuid || undefined,
        authorName: myDisplayName,
        createdAt: new Date().toISOString(),
        isMine: true,
      },
    ]);
    setCommentText("");

    try {
      const created = await createReviewComment({
        reviewId,
        content: trimmed,
        parentCommentId: null,
      });

      if (created) {
        setComments((prev) => prev.map((c) => (String(c.id) === tempId ? { ...created, isMine: true } : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => String(c.id) !== tempId));
      alert("댓글 작성 실패");
    }
  };

  const onStartEdit = (c: UiComment) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (c.isMine !== true) return;

    setReplyingParentId(null);
    setReplyText("");
    setEditingId(String(c.id));
    setEditingText(c.content ?? "");
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const onSaveEdit = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!editingId) return;

    const value = editingText.trim();
    if (!value) return alert("내용을 입력해주세요.");

    const id = editingId;
    const prev = comments;

    setComments((cur) => cur.map((c) => (String(c.id) === id ? { ...c, content: value } : c)));
    setEditingId(null);
    setEditingText("");

    try {
      await updateComment(id, value);
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 수정 실패");
    }
  };

  const onStartReply = (parentId: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    setEditingId(null);
    setEditingText("");
    setReplyingParentId(parentId);
    setReplyText("");
  };

  const onCancelReply = () => {
    setReplyingParentId(null);
    setReplyText("");
  };

  const onSubmitReply = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!reviewId || !Number.isFinite(reviewId)) return;
    if (!replyingParentId) return;

    const trimmed = replyText.trim();
    if (!trimmed) return alert("내용을 입력해주세요.");

    const parentNum = safeToInt(replyingParentId);
    if (parentNum == null) return alert("부모 댓글 ID 파싱 실패");

    const tempId = `temp-${crypto.randomUUID()}`;

    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        parentId: replyingParentId,
        content: trimmed,
        authorUuid: meUuid || undefined,
        authorName: myDisplayName,
        createdAt: new Date().toISOString(),
        isMine: true,
      },
    ]);

    setReplyingParentId(null);
    setReplyText("");

    try {
      const created = await createReviewComment({
        reviewId,
        content: trimmed,
        parentCommentId: parentNum,
      });

      if (created) {
        setComments((prev) => prev.map((c) => (String(c.id) === tempId ? { ...created, isMine: true } : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => String(c.id) !== tempId));
      alert("답글 작성 실패");
    }
  };

  const onDeleteComment = async (id: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const target = comments.find((c) => String(c.id) === String(id));
    if (target?.isMine !== true) return;

    if (!window.confirm("삭제하시겠습니까?")) return;

    const prev = comments;
    setComments((cur) => cur.filter((c) => String(c.id) !== String(id) && String(c.parentId ?? "") !== String(id)));

    try {
      await deleteComment(String(id));
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 삭제 실패");
    }
  };

  return (
    <section className="rd-comments">
      <div className="rd-comments-head">
        <h3 className="rd-comments-title">Comments ({comments.length})</h3>
      </div>

      {commentsLoading && <div className="rd-comments-hint">Loading comments...</div>}
      {commentsError && <div className="rd-comments-hint">{commentsError}</div>}

      <div className="rd-comment-input">
        <input
          className="rd-comment-input-field"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글을 입력하세요..."
        />
        <button type="button" className="rd-btn" onClick={onSubmitComment}>
          등록
        </button>
      </div>

      <div className="rd-comment-list">
        {rootComments.map((c) => {
          const replies = repliesByParent.get(String(c.id)) ?? [];
          const canEdit = c.isMine === true;
          const canDelete = c.isMine === true;

          const isEditing = editingId === String(c.id);
          const isReplying = replyingParentId === String(c.id);

          return (
            <div key={String(c.id)} className="rd-comment-item">
              <div className="rd-comment-meta">
                <strong>{c.authorName ?? "User"}</strong>
                <span className="rd-dot">·</span>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}</span>
              </div>

              {!isEditing ? (
                <div className="rd-comment-text">{c.content}</div>
              ) : (
                <div className="rd-inline-edit">
                  <textarea
                    className="rd-inline-textarea"
                    rows={3}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                  />
                  <div className="rd-inline-actions">
                    <button type="button" className="rd-btn" onClick={onCancelEdit}>
                      취소
                    </button>
                    <button type="button" className="rd-btn" onClick={onSaveEdit}>
                      저장
                    </button>
                  </div>
                </div>
              )}

              <div className="rd-comment-actions">
                <button type="button" className="rd-link" onClick={() => onStartReply(String(c.id))}>
                  답글
                </button>

                {canEdit && (
                  <>
                    <span className="rd-dot">·</span>
                    <button type="button" className="rd-link" onClick={() => onStartEdit(c)}>
                      수정
                    </button>
                  </>
                )}

                {canDelete && (
                  <>
                    <span className="rd-dot">·</span>
                    <button type="button" className="rd-link" onClick={() => onDeleteComment(String(c.id))}>
                      삭제
                    </button>
                  </>
                )}
              </div>

              {isReplying && (
                <div className="rd-inline-reply">
                  <textarea
                    className="rd-inline-textarea"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답글을 입력하세요..."
                  />
                  <div className="rd-inline-actions">
                    <button type="button" className="rd-btn" onClick={onCancelReply}>
                      취소
                    </button>
                    <button type="button" className="rd-btn" onClick={onSubmitReply}>
                      등록
                    </button>
                  </div>
                </div>
              )}

              {replies.length > 0 && (
                <div className="rd-replies">
                  {replies.map((r) => {
                    const rCanEdit = r.isMine === true;
                    const rCanDelete = r.isMine === true;
                    const rIsEditing = editingId === String(r.id);

                    return (
                      <div key={String(r.id)} className="rd-reply-item">
                        <div className="rd-comment-meta">
                          <strong>{r.authorName ?? "User"}</strong>
                          <span className="rd-dot">·</span>
                          <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span>
                        </div>

                        {!rIsEditing ? (
                          <div className="rd-comment-text">{r.content}</div>
                        ) : (
                          <div className="rd-inline-edit">
                            <textarea
                              className="rd-inline-textarea"
                              rows={3}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                            />
                            <div className="rd-inline-actions">
                              <button type="button" className="rd-btn" onClick={onCancelEdit}>
                                취소
                              </button>
                              <button type="button" className="rd-btn" onClick={onSaveEdit}>
                                저장
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="rd-comment-actions">
                          {rCanEdit && (
                            <button type="button" className="rd-link" onClick={() => onStartEdit(r)}>
                              수정
                            </button>
                          )}
                          {rCanDelete && (
                            <>
                              <span className="rd-dot">·</span>
                              <button type="button" className="rd-link" onClick={() => onDeleteComment(String(r.id))}>
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
