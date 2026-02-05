// FE/src/pages/artworks/ArtworkDetailView.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
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
  reviews: ReviewSummary[] | undefined | null; // ✅ 방어적으로
  reviewsLoading: boolean;
  reviewsError: string | null;

  // comments
  comments: UiComment[] | undefined | null; // ✅ 방어적으로
  commentsLoading: boolean;
  commentsError: string | null;

  commentText: string;
  onChangeCommentText: (v: string) => void;
  onSubmitComment: () => void;

  onDeleteComment: (id: string) => void;

  // legacy
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

function formatDate(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function ArtworkDetailView(props: Props) {
  const {
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
  } = props;

  // ✅ 여기서부터 전부 "undefined 들어와도 안 터지게" 정규화
  const safeReviews = useMemo(() => asArray<ReviewSummary>(reviews), [reviews]);
  const safeComments = useMemo(() => asArray<UiComment>(comments), [comments]);

  const title = String((artwork as any)?.title ?? "");
  const artistName = String((artwork as any)?.artist ?? "");

  const safeTags = useMemo(() => {
    const raw = (artwork as any)?.tags;

    // tags가 배열이면 그대로
    if (Array.isArray(raw)) return raw;

    // tags가 문자열이면 한 개 태그로 취급(또는 공백/쉼표 분리)
    if (typeof raw === "string") {
      const s = raw.trim();
      if (!s) return [];
      // "#햄스터 #고양이" / "햄스터, 고양이" 같은 케이스까지 커버
      return s
        .replaceAll("#", " ")
        .split(/[,\s]+/g)
        .map((x) => x.trim())
        .filter(Boolean);
    }

    return [];
  }, [artwork]);

  const rootComments = useMemo(() => {
    return safeComments.filter((c) => !c.parentId);
  }, [safeComments]);

  const repliesMap = useMemo(() => {
    const map = new Map<string, UiComment[]>();

    safeComments
      .filter((c) => !!c.parentId)
      .forEach((c) => {
        const pid = String(c.parentId);
        const arr = map.get(pid) ?? [];
        arr.push(c);
        map.set(pid, arr);
      });

    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(String(a.createdAt)) : 0;
        const tb = b.createdAt ? Date.parse(String(b.createdAt)) : 0;
        return ta - tb;
      });
      map.set(k, arr);
    }

    return map;
  }, [safeComments]);

  const canShowDelete = (c: UiComment) => c.isMine === true || isOwner === true;
  const canShowEdit = (c: UiComment) => c.isMine === true;

  const renderComment = (c: UiComment) => {
    const id = String((c as any).id ?? "");
    const authorId = String((c as any).authorId ?? "").trim();
    const authorName = String((c as any).authorName ?? "익명").trim();
    const createdAt = (c as any).createdAt;

    const isEditing = editingId === id;
    const isReplying = replyingParentId === id;

    const replies = asArray<UiComment>(repliesMap.get(id));

    return (
      <div key={id} className="comment-item">
        <div className="comment-meta">
          {authorId ? (
            <Link className="comment-author-link" to={commentAuthorProfilePath(authorId)}>
              <strong>{authorName}</strong>
            </Link>
          ) : (
            <strong>{authorName}</strong>
          )}

          {createdAt ? <span>{formatDate(createdAt)}</span> : null}
          {c.isMine ? <span className="comment-mine">(내 댓글)</span> : null}
        </div>

        {!isEditing ? (
          <div className="comment-text">{String((c as any).content ?? "")}</div>
        ) : (
          <div className="comment-editbox">
            <textarea
              className="input-minimal textarea"
              rows={3}
              value={editingText}
              onChange={(e) => onChangeEditingText(e.target.value)}
              placeholder="수정 내용을 입력하세요."
            />
            <div className="inline-actions">
              <button className="btn-submit secondary" type="button" onClick={onCancelEdit}>
                취소
              </button>
              <button className="btn-submit" type="button" onClick={onSaveEdit}>
                저장
              </button>
            </div>
          </div>
        )}

        <div className="comment-actions">
          <button className="text-btn" type="button" onClick={() => onStartReply(id)}>
            답글
          </button>

          {canShowEdit(c) ? (
            <button
              className="text-btn"
              type="button"
              onClick={() => onStartEdit(id, String((c as any).content ?? ""))}
            >
              수정
            </button>
          ) : null}

          {canShowDelete(c) ? (
            <button className="text-btn danger" type="button" onClick={() => onDeleteComment(id)}>
              삭제
            </button>
          ) : null}
        </div>

        {isReplying ? (
          <div className="comment-replybox">
            <textarea
              className="input-minimal textarea"
              rows={3}
              value={replyText}
              onChange={(e) => onChangeReplyText(e.target.value)}
              placeholder="답글을 입력하세요."
            />
            <div className="inline-actions">
              <button className="btn-submit secondary" type="button" onClick={onCancelReply}>
                취소
              </button>
              <button className="btn-submit" type="button" onClick={onSubmitReply}>
                등록
              </button>
            </div>
          </div>
        ) : null}

        {replies.length > 0 ? <div className="replies">{replies.map(renderComment)}</div> : null}
      </div>
    );
  };

  return (
    <div className="artwork-detail-page">
      {/* 상단 고정 헤더 */}
      <div className="artwork-detail-top">
        <button className="btn-icon" type="button" onClick={onGoHome}>
          홈
        </button>

        {isOwner ? (
          <div className="top-actions">
            <button className="btn-icon" type="button" onClick={onGoEdit}>
              수정
            </button>
            <button className="btn-icon danger" type="button" onClick={onDeleteArtwork}>
              삭제
            </button>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* HERO */}
      <section className="artwork-hero">
        <div className="hero-content">
          <h1 className="hero-title">{title}</h1>

          <div className="hero-artist">
            {artistName ? (
              artistProfilePath ? (
                <Link className="hero-artist-link" to={artistProfilePath}>
                  {artistName}
                </Link>
              ) : (
                <span>{artistName}</span>
              )
            ) : null}
          </div>

          <div className="hero-frame">
            {!imageError ? (
              <img
                className="hero-img"
                src={displayImgSrc || String((artwork as any)?.src ?? "")}
                alt={title || "artwork"}
                onError={onHeroImgError}
              />
            ) : (
              <div className="hero-fallback">이미지 로드 실패</div>
            )}
          </div>
        </div>

        <div className="scroll-indicator">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* BODY */}
      <main className="artwork-body">
        <div className="content-wrapper">
          {/* 액션바 */}
          <div className="action-bar">
            <div className="action-left">
              <h2>{title}</h2>
              <p>{artistName}</p>
            </div>

            <div className="action-right">
              {!isOwner ? (
                <>
                  <button className="btn-icon" type="button" onClick={onToggleFollow}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>

                  <button
                    className={`btn-icon gold ${isLiked ? "active" : ""}`}
                    type="button"
                    onClick={onToggleFavorite}
                  >
                    {isLiked ? "♥" : "♡"} {likeCount}
                  </button>
                </>
              ) : (
                <div className="like-count-only" aria-label={`좋아요 ${likeCount}개`}>
                  <span>좋아요</span>
                  <strong>{likeCount}</strong>
                </div>
              )}

              <button className="btn-icon" type="button" onClick={onOpenFanLetter}>
                FanLetter
              </button>
            </div>
          </div>

          {/* 설명/태그 */}
          <section className="info-section">
            {(artwork as any)?.description ? (
              <p className="description">{String((artwork as any).description)}</p>
            ) : null}

            {safeTags.length > 0 ? (
              <div className="tags-row">
                {safeTags.map((t: any, idx: number) => (
                  <span key={`${String(t)}-${idx}`} className="tag-pill">
                    #{String(t)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {/* 감상평 */}
          <section className="discovery-section">
            <h3 className="section-title">감상평</h3>

            {reviewsLoading ? <div style={{ opacity: 0.8 }}>로딩 중...</div> : null}
            {reviewsError ? <div style={{ opacity: 0.85 }}>{reviewsError}</div> : null}

            {!reviewsLoading && !reviewsError ? (
              safeReviews.length > 0 ? (
                <div className="review-list" style={{ display: "grid", gap: 10 }}>
                  {safeReviews.map((r) => {
                    const rid = (r as any).reviewId ?? (r as any).id;
                    return (
                      <button
                        key={String(rid)}
                        className="review-card"
                        type="button"
                        onClick={() => onGoReview(rid)}
                      >
                        <div className="review-title">{String((r as any).title ?? "제목 없음")}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ opacity: 0.75 }}>아직 감상평이 없습니다.</div>
              )
            ) : null}
          </section>

          {/* 댓글 */}
          <section className="comments-container">
            <h3 className="section-title">댓글</h3>

            <div className="comment-input-wrap">
              <textarea
                className="input-minimal textarea"
                rows={3}
                value={commentText}
                onChange={(e) => onChangeCommentText(e.target.value)}
                placeholder="댓글을 입력하세요."
              />
              <button className="btn-submit" type="button" onClick={onSubmitComment}>
                등록
              </button>
            </div>

            {commentsLoading ? <div style={{ opacity: 0.8 }}>로딩 중...</div> : null}
            {commentsError ? <div style={{ opacity: 0.85 }}>{commentsError}</div> : null}

            {!commentsLoading && !commentsError ? (
              rootComments.length > 0 ? (
                <div className="comment-list">{rootComments.map(renderComment)}</div>
              ) : (
                <div style={{ opacity: 0.75 }}>아직 댓글이 없습니다.</div>
              )
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
