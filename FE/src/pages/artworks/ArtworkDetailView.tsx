import { useMemo } from "react";
import { resolveMediaUrl, safeToInt } from "./detail/utils";
import type { ArtworkDetailData, ReviewSummary, LocalComment } from "./detail/mappers";

type Props = {
  artwork: ArtworkDetailData;
  isOwner: boolean;

  // hero 이미지
  displayImgSrc: string;
  imageError: boolean;
  onHeroImgError: () => void;

  // 좋아요/팔로우/팬레터
  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
  onToggleFavorite: () => void;
  onToggleFollow: () => void;
  onOpenFanLetter: () => void;

  // 편집/삭제/이동
  onGoEdit: () => void;
  onDeleteArtwork: () => void;
  onGoHome: () => void;
  onGoReview: (id: string | number) => void;

  // 리뷰
  reviews: ReviewSummary[];
  reviewsLoading: boolean;
  reviewsError: string | null;

  // 댓글
  comments: LocalComment[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  onChangeCommentText: (v: string) => void;
  onSubmitComment: () => void;
  onEditComment: (id: string, current: string) => void;
  onDeleteComment: (id: string) => void;
  onReplyComment: (parentId: string) => void;
};

export default function ArtworkDetailView(p: Props) {
  const rootComments = useMemo(() => p.comments.filter((c) => c.parentId == null), [p.comments]);

  const repliesByParent = useMemo(() => {
    const m = new Map<string, LocalComment[]>();
    for (const c of p.comments) {
      if (!c.parentId) continue;
      const list = m.get(c.parentId) ?? [];
      list.push(c);
      m.set(c.parentId, list);
    }
    return m;
  }, [p.comments]);

  return (
    <div className="artwork-detail-page">
      {/* Hero */}
      <section className="artwork-hero">
        <div className="hero-content">
          <h1 className="hero-title">{p.artwork.title}</h1>
          <div className="hero-artist">by {p.artwork.artist}</div>

          <div className="hero-frame">
            {p.imageError ? (
              <div style={{ width: 400, height: 500, background: "#222", display: "grid", placeItems: "center" }}>
                Image Error
              </div>
            ) : (
              <img
                src={p.displayImgSrc || p.artwork.src}
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
              {p.artwork.tags.map((t) => (
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
              {rootComments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-meta">
                    <strong>{c.authorName ?? "User"}</strong>
                  </div>
                  <div className="comment-text">{c.content}</div>

                  <div className="comment-actions">
                    <button className="text-btn" onClick={() => p.onEditComment(c.id, c.content)}>
                      Edit
                    </button>
                    <button className="text-btn" onClick={() => p.onDeleteComment(c.id)}>
                      Delete
                    </button>
                    <button className="text-btn" onClick={() => p.onReplyComment(c.id)}>
                      Reply
                    </button>
                  </div>

                  {(repliesByParent.get(c.id) ?? []).length > 0 && (
                    <div className="replies">
                      {(repliesByParent.get(c.id) ?? []).map((r) => (
                        <div key={r.id} className="reply-item">
                          <div className="comment-meta">
                            <strong>{r.authorName ?? "User"}</strong>
                          </div>
                          <div className="comment-text">{r.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
