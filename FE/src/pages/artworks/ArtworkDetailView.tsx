// FE/src/pages/artworks/ArtworkDetailView.tsx
import { useMemo } from "react";
import type { ArtworkDetailData, LocalComment, ReviewSummary } from "./detail/mappers";

type UiComment = LocalComment & {
  authorId?: string;
  authorName?: string;
  isMine?: boolean;
};

type Props = {
  artwork: ArtworkDetailData;

  // owner
  isOwner: boolean;

  // hero image
  displayImgSrc: string;
  imageError: boolean;
  onHeroImgError: () => void;

  // like/follow
  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
  onToggleFavorite: () => void;
  onToggleFollow: () => void;

  // actions
  onOpenFanLetter: () => void;
  onGoEdit: () => void;
  onDeleteArtwork: () => void;
  onGoHome: () => void;

  // review
  onGoReview: (id: string | number) => void;
  reviews: ReviewSummary[];
  reviewsLoading: boolean;
  reviewsError: string | null;

  // comments
  comments: UiComment[];
  commentsLoading: boolean;
  commentsError: string | null;

  commentText: string;
  onChangeCommentText: (v: string) => void;
  onSubmitComment: () => void;

  onDeleteComment: (id: string) => void;

  // legacy(현재 상위에서 빈 함수로 내려옴)
  onEditComment: (id: string, content: string) => void;
  onReplyComment: (parentId: string, content: string) => void;

  // profile paths
  artistProfilePath?: string;
  commentAuthorProfilePath: (authorId: string) => string;

  // inline edit/reply
  editingId: string | null;
  editingText: string;
  onStartEdit: (id: string, current: string) => void;
  onChangeEditingText: (v: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;

  replyingParentId: string | null;
  replyText: string;
  onStartReply: (parentId: string) => void;
  onChangeReplyText: (v: string) => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
};

export default function ArtworkDetailView({
  artwork,
  isOwner,
  displayImgSrc,
  imageError,
  onHeroImgError,

  isLiked,
  likeCount,
  isFollowing,
  onToggleFavorite,
  onToggleFollow,

  onOpenFanLetter,
  onGoEdit,
  onDeleteArtwork,
  onGoHome,

  onGoReview,
  reviews,
  reviewsLoading,
  reviewsError,

  comments,
  commentsLoading,
  commentsError,
  commentText,
  onChangeCommentText,
  onSubmitComment,
  onDeleteComment,

  // legacy
  onEditComment,
  onReplyComment,

  artistProfilePath,
  commentAuthorProfilePath,

  editingId,
  editingText,
  onStartEdit,
  onChangeEditingText,
  onCancelEdit,
  onSaveEdit,

  replyingParentId,
  replyText,
  onStartReply,
  onChangeReplyText,
  onCancelReply,
  onSubmitReply,
}: Props) {
  const tags = useMemo(() => (Array.isArray((artwork as any)?.tags) ? (artwork as any).tags : []), [artwork]);

  const rootComments = useMemo(() => {
    return (comments ?? []).filter((c) => !c.parentId);
  }, [comments]);

  const repliesMap = useMemo(() => {
    const map = new Map<string, UiComment[]>();
    (comments ?? [])
      .filter((c) => !!c.parentId)
      .forEach((c) => {
        const pid = String(c.parentId);
        const arr = map.get(pid) ?? [];
        arr.push(c);
        map.set(pid, arr);
      });

    // createdAt 있으면 시간순 정렬(없으면 입력 순)
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(String(a.createdAt)) : 0;
        const tb = b.createdAt ? Date.parse(String(b.createdAt)) : 0;
        return ta - tb;
      });
      map.set(k, arr);
    }

    return map;
  }, [comments]);

  const canShowDelete = (c: UiComment) => c.isMine === true || isOwner === true;
  const canShowEdit = (c: UiComment) => c.isMine === true;

  const renderComment = (c: UiComment, depth: number) => {
    const id = String((c as any).id ?? "");
    const authorId = String((c as any).authorId ?? "").trim();
    const authorName = String((c as any).authorName ?? "익명").trim();
    const isEditing = editingId === id;
    const isReplying = replyingParentId === id;

    const replies = repliesMap.get(id) ?? [];

    return (
      <div key={id} className={`comment-item depth-${depth}`} style={{ marginLeft: depth ? 18 : 0 }}>
        <div className="comment-head" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {authorId ? (
              <a className="comment-author" href={commentAuthorProfilePath(authorId)}>
                {authorName}
              </a>
            ) : (
              <span className="comment-author">{authorName}</span>
            )}

            {(c as any).createdAt ? (
              <span className="comment-date" style={{ opacity: 0.7, fontSize: 12 }}>
                {String((c as any).createdAt)}
              </span>
            ) : null}

            {c.isMine ? (
              <span className="comment-mine" style={{ fontSize: 12, opacity: 0.75 }}>
                (내 댓글)
              </span>
            ) : null}
          </div>

          <div className="comment-actions" style={{ display: "flex", gap: 8 }}>
            {/* 답글 */}
            <button className="btn-text" type="button" onClick={() => onStartReply(id)}>
              답글
            </button>

            {/* 수정(작성자만) */}
            {canShowEdit(c) && (
              <button className="btn-text" type="button" onClick={() => onStartEdit(id, String((c as any).content ?? ""))}>
                수정
              </button>
            )}

            {/* 삭제(작성자 or 작품주인) */}
            {canShowDelete(c) && (
              <button className="btn-text danger" type="button" onClick={() => onDeleteComment(id)}>
                삭제
              </button>
            )}
          </div>
        </div>

        {/* 본문 / 편집 */}
        {!isEditing ? (
          <div className="comment-body" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
            {String((c as any).content ?? "")}
          </div>
        ) : (
          <div className="comment-edit" style={{ marginTop: 10 }}>
            <textarea
              className="comment-edit-textarea"
              rows={3}
              value={editingText}
              onChange={(e) => onChangeEditingText(e.target.value)}
              placeholder="수정 내용을 입력하세요."
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-icon" type="button" onClick={onCancelEdit}>
                취소
              </button>
              <button className="btn-icon gold" type="button" onClick={onSaveEdit}>
                저장
              </button>
            </div>
          </div>
        )}

        {/* 답글 입력 */}
        {isReplying ? (
          <div className="comment-reply" style={{ marginTop: 10 }}>
            <textarea
              className="comment-reply-textarea"
              rows={3}
              value={replyText}
              onChange={(e) => onChangeReplyText(e.target.value)}
              placeholder="답글을 입력하세요."
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-icon" type="button" onClick={onCancelReply}>
                취소
              </button>
              <button className="btn-icon gold" type="button" onClick={onSubmitReply}>
                등록
              </button>
            </div>
          </div>
        ) : null}

        {/* 답글 리스트 */}
        {replies.length > 0 ? (
          <div className="comment-replies" style={{ marginTop: 12 }}>
            {replies.map((r) => renderComment(r, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="artwork-detail-page">
      {/* 상단 헤더 */}
      <div className="artwork-detail-top" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button className="btn-icon" onClick={onGoHome}>
          홈
        </button>

        {isOwner ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-icon" onClick={onGoEdit}>
              수정
            </button>
            <button className="btn-icon danger" onClick={onDeleteArtwork}>
              삭제
            </button>
          </div>
        ) : null}
      </div>

      {/* 작품 메인 */}
      <div className="artwork-hero" style={{ marginTop: 18 }}>
        <div className="artwork-hero-img" style={{ width: "100%", overflow: "hidden" }}>
          {!imageError ? (
            <img
              src={displayImgSrc || (artwork as any)?.src || ""}
              alt={String((artwork as any)?.title ?? "artwork")}
              onError={onHeroImgError}
              style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 14 }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 320,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                opacity: 0.8,
              }}
            >
              이미지 로드 실패
            </div>
          )}
        </div>

        <div className="artwork-hero-meta" style={{ marginTop: 14 }}>
          <h2 style={{ margin: 0 }}>{String((artwork as any)?.title ?? "")}</h2>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {(artwork as any)?.artist ? (
              artistProfilePath ? (
                <a href={artistProfilePath} className="artist-link" style={{ opacity: 0.9 }}>
                  {String((artwork as any).artist)}
                </a>
              ) : (
                <span style={{ opacity: 0.9 }}>{String((artwork as any).artist)}</span>
              )
            ) : null}

            {/* ✅ 요청 반영: 본인 작품이면 팔로우 X, 좋아요는 횟수만 */}
            {!isOwner ? (
              <>
                <button className="btn-icon" type="button" onClick={onToggleFollow}>
                  {isFollowing ? "Following" : "Follow"}
                </button>

                <button className="btn-icon gold" type="button" onClick={onToggleFavorite}>
                  {isLiked ? "♥" : "♡"} {likeCount}
                </button>
              </>
            ) : (
              <div
                className="like-count-only"
                aria-label={`좋아요 ${likeCount}개`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  opacity: 0.9,
                }}
              >
                <span style={{ opacity: 0.85 }}>좋아요</span>
                <strong>{likeCount}</strong>
              </div>
            )}

            {/* 팬레터는 기존 동작 유지(원하면 isOwner일 때 숨김도 가능) */}
            <button className="btn-icon" type="button" onClick={onOpenFanLetter}>
              FanLetter
            </button>
          </div>

          {(artwork as any)?.description ? (
            <p style={{ marginTop: 12, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {String((artwork as any).description)}
            </p>
          ) : null}

          {tags.length > 0 ? (
            <div className="artwork-tags" style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map((t: any, idx: number) => (
                <span
                  key={`${String(t)}-${idx}`}
                  className="tag"
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.18)",
                    opacity: 0.85,
                    fontSize: 12,
                  }}
                >
                  #{String(t)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* 리뷰 섹션 */}
      <section style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 10 }}>감상평</h3>

        {reviewsLoading ? <div style={{ opacity: 0.8 }}>로딩 중...</div> : null}
        {reviewsError ? <div style={{ opacity: 0.85 }}>{reviewsError}</div> : null}

        {!reviewsLoading && !reviewsError ? (
          reviews.length > 0 ? (
            <div className="review-list" style={{ display: "grid", gap: 10 }}>
              {reviews.map((r) => {
                const rid = (r as any).reviewId ?? (r as any).id;
                return (
                  <button
                    key={String(rid)}
                    className="review-card"
                    type="button"
                    onClick={() => onGoReview(rid)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{String((r as any).title ?? "제목 없음")}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ opacity: 0.75 }}>아직 감상평이 없습니다.</div>
          )
        ) : null}
      </section>

      {/* 댓글 섹션 */}
      <section style={{ marginTop: 28, marginBottom: 60 }}>
        <h3 style={{ marginBottom: 10 }}>댓글</h3>

        {/* 댓글 작성 */}
        <div className="comment-compose" style={{ display: "grid", gap: 10 }}>
          <textarea
            className="comment-textarea"
            rows={3}
            value={commentText}
            onChange={(e) => onChangeCommentText(e.target.value)}
            placeholder="댓글을 입력하세요."
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-icon gold" type="button" onClick={onSubmitComment}>
              등록
            </button>
          </div>
        </div>

        {/* 댓글 리스트 */}
        <div style={{ marginTop: 16 }}>
          {commentsLoading ? <div style={{ opacity: 0.8 }}>로딩 중...</div> : null}
          {commentsError ? <div style={{ opacity: 0.85 }}>{commentsError}</div> : null}

          {!commentsLoading && !commentsError ? (
            rootComments.length > 0 ? (
              <div className="comment-list" style={{ display: "grid", gap: 14 }}>
                {rootComments.map((c) => renderComment(c, 0))}
              </div>
            ) : (
              <div style={{ opacity: 0.75 }}>아직 댓글이 없습니다.</div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
