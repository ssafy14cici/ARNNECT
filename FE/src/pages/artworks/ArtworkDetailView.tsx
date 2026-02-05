// FE/src/pages/artworks/ArtworkDetailView.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "./detail/utils";
import type { ArtworkDetailData, ReviewSummary, LocalComment } from "./detail/mappers";

type Props = {
  artwork: ArtworkDetailData;
  isOwner: boolean;

  displayImgSrc: string;
  imageError: boolean;
  onHeroImgError: () => void;

  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
  onToggleFavorite: () => void;
  onToggleFollow: () => void;
  onOpenFanLetter: () => void;

  onGoEdit: () => void;
  onDeleteArtwork: () => void;
  onGoHome: () => void;
  onGoReview: (id: string | number) => void;

  reviews: ReviewSummary[];
  reviewsLoading: boolean;
  reviewsError: string | null;

  comments: LocalComment[];
  commentsLoading: boolean;
  commentsError: string | null;

  commentText: string;
  onChangeCommentText: (v: string) => void;
  onSubmitComment: () => void;

  // (레거시) 안 쓰면 부모에서 no-op 가능
  onEditComment: (id: string, current: string) => void;
  onDeleteComment: (id: string) => void;
  onReplyComment: (parentId: string) => void;

  // ✅ 인라인 편집
  editingId?: string | null;
  editingText?: string;
  onStartEdit?: (id: string, current: string) => void;
  onChangeEditingText?: (v: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;

  // ✅ 답글
  replyingParentId?: string | null;
  replyText?: string;
  onStartReply?: (parentId: string) => void;
  onChangeReplyText?: (v: string) => void;
  onCancelReply?: () => void;
  onSubmitReply?: () => void;

  // ✅ 작가 프로필 경로
  artistProfilePath?: string;

  // ✅ 댓글 작성자 프로필 경로 만들기
  commentAuthorProfilePath?: (authorId: string) => string;
};

export default function ArtworkDetailView(p: Props) {
  const rootComments = useMemo(
    () => p.comments.filter((c) => (c as any).parentId == null),
    [p.comments],
  );

  const repliesByParent = useMemo(() => {
    const m = new Map<string, LocalComment[]>();

    for (const c of p.comments) {
      const parent = (c as any).parentId;
      if (parent == null) continue;

      const key = String(parent);
      const list = m.get(key) ?? [];
      list.push(c);
      m.set(key, list);
    }
    return m;
  }, [p.comments]);

  const ArtistName = () => {
    // ✅ artistProfilePath가 없으면 span으로만 (undefined Link 방지)
    if (p.artistProfilePath) {
      return (
        <Link className="hero-artist-link" to={p.artistProfilePath}>
          {p.artwork.artist}
        </Link>
      );
    }
    return <span className="hero-artist-link">{p.artwork.artist}</span>;
  };

  const AuthorName = ({ name, authorId }: { name: string; authorId?: string }) => {
    const id = String(authorId ?? "").trim();
    if (id && p.commentAuthorProfilePath) {
      return (
        <Link className="comment-author-link" to={p.commentAuthorProfilePath(id)}>
          {name}
        </Link>
      );
    }
    return <span className="comment-author-link">{name}</span>;
  };

  const startEdit = (id: string, current: string) => {
    // ✅ 새 인라인 편집 우선
    if (p.onStartEdit) return p.onStartEdit(id, current);
    // fallback
    return p.onEditComment(id, current);
  };

  const startReply = (parentId: string) => {
    if (p.onStartReply) return p.onStartReply(parentId);
    return p.onReplyComment(parentId);
  };

  return (
    <div className="artwork-detail-page">
      {/* Hero */}
      <section className="artwork-hero">
        <div className="hero-content">
          <h1 className="hero-title">{p.artwork.title}</h1>

          <div className="hero-artist">
            by <ArtistName />
          </div>

          <div className="hero-frame">
            {p.imageError ? (
              <div style={{ width: 400, height: 500, background: "#222", display: "grid", placeItems: "center" }}>
                Image Error
              </div>
            ) : (
              <img
                src={p.displayImgSrc || (p.artwork as any).src}
                alt={p.artwork.title}
                className="hero-img"
                onError={p.onHeroImgError}
              />
            )}
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* Body */}
      <div className="artwork-body">
        <div className="content-wrapper">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="action-left" />

            <div className="action-right">
              <button className={`btn-icon ${p.isLiked ? "active" : ""}`} onClick={p.onToggleFavorite}>
                {p.isLiked ? "♥" : "♡"} {p.likeCount}
              </button>

              <button className="btn-icon" onClick={p.onToggleFollow}>
                {p.isFollowing ? "Following" : "Follow"}
              </button>

              <button className="btn-icon gold" onClick={p.onOpenFanLetter}>
                ✉ FanLetter
              </button>

              {p.isOwner && (
                <>
                  <button className="btn-icon" type="button" onClick={p.onGoEdit}>
                    Edit
                  </button>
                  <button className="btn-icon" type="button" onClick={p.onDeleteArtwork}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <section className="info-section">
            <p className="description">{p.artwork.description}</p>
            <div className="tags-row">
              {(p.artwork.tags ?? []).map((t) => (
                <span key={t} className="tag-pill">
                  #{t}
                </span>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="discovery-section">
            <h3 className="section-title">Reviews</h3>

            {p.reviewsLoading ? (
              <div style={{ opacity: 0.7 }}>Loading reviews...</div>
            ) : p.reviewsError ? (
              <div style={{ opacity: 0.7 }}>{p.reviewsError}</div>
            ) : p.reviews.length === 0 ? (
              <div style={{ opacity: 0.7 }}>등록된 감상평이 없습니다.</div>
            ) : (
              <div className="artwork-grid">
                {p.reviews.map((r) => (
                  <button
                    key={String(r.reviewId)}
                    type="button"
                    className="grid-card"
                    onClick={() => p.onGoReview(r.reviewId)}
                  >
                    <div className="card-thumb">
                      {r.imageUrl ? (
                        <img
                          src={resolveMediaUrl(r.imageUrl)}
                          alt={r.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: 180, background: "#111", opacity: 0.15 }} />
                      )}
                    </div>

                    <div className="card-info" style={{ display: "grid", gap: 4 }}>
                      <div>{r.title ?? "Untitled"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Comments */}
          <section className="comments-container">
            <h3 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 20 }}>
              Comments ({p.comments.length})
            </h3>

            {p.commentsLoading && <div style={{ opacity: 0.7, marginBottom: 10 }}>Loading comments...</div>}
            {p.commentsError && <div style={{ opacity: 0.7, marginBottom: 10 }}>{p.commentsError}</div>}
            {!p.commentsLoading && !p.commentsError && p.comments.length === 0 && (
              <div style={{ opacity: 0.7, marginBottom: 10 }}>아직 댓글이 없습니다.</div>
            )}

            <div className="comment-input-wrap">
              <input
                className="input-minimal"
                value={p.commentText}
                onChange={(e) => p.onChangeCommentText(e.target.value)}
                placeholder="Share your thoughts..."
              />
              <button type="button" className="btn-submit" onClick={p.onSubmitComment}>
                Post
              </button>
            </div>

            <div className="comment-list">
              {rootComments.map((c) => {
                const id = String((c as any).id);
                const replies = repliesByParent.get(id) ?? [];

                const isEditing = p.editingId != null && String(p.editingId) === id;
                const isReplying = p.replyingParentId != null && String(p.replyingParentId) === id;

                return (
                  <div key={id} className="comment-item">
                    <div className="comment-meta">
                      <strong>
                        <AuthorName name={(c as any).authorName ?? "User"} authorId={(c as any).authorId} />
                      </strong>
                    </div>

                    {/* ✅ 인라인 편집 */}
                    {!isEditing ? (
                      <div className="comment-text">{(c as any).content}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        <textarea
                          className="rd-inline-textarea"
                          rows={3}
                          value={p.editingText ?? ""}
                          onChange={(e) => p.onChangeEditingText?.(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="text-btn" onClick={p.onCancelEdit}>
                            취소
                          </button>
                          <button className="text-btn" onClick={p.onSaveEdit}>
                            저장
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="comment-actions">
                      <button className="text-btn" onClick={() => startEdit(id, String((c as any).content ?? ""))}>
                        Edit
                      </button>
                      <button className="text-btn" onClick={() => p.onDeleteComment(id)}>
                        Delete
                      </button>
                      <button className="text-btn" onClick={() => startReply(id)}>
                        Reply
                      </button>
                    </div>

                    {/* ✅ 답글 입력 */}
                    {isReplying && (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        <textarea
                          className="rd-inline-textarea"
                          rows={3}
                          value={p.replyText ?? ""}
                          onChange={(e) => p.onChangeReplyText?.(e.target.value)}
                          placeholder="답글을 입력하세요..."
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="text-btn" onClick={p.onCancelReply}>
                            취소
                          </button>
                          <button className="text-btn" onClick={p.onSubmitReply}>
                            등록
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="replies">
                        {replies.map((r) => (
                          <div key={String((r as any).id)} className="reply-item">
                            <div className="comment-meta">
                              <strong>
                                <AuthorName name={(r as any).authorName ?? "User"} authorId={(r as any).authorId} />
                              </strong>
                            </div>
                            <div className="comment-text">{(r as any).content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="btn-icon" style={{ marginTop: 12 }} onClick={p.onGoHome}>
              홈으로
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
