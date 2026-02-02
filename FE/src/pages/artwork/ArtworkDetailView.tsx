// FE/src/pages/artwork/ArtworkDetailView.tsx
import { CommentForm } from "../../features/artwork/ui/comments/CommentForm";
import { CommentList } from "../../features/artwork/ui/comments/CommentList";
import type { Comment, ArtworkBase, ArtworkDetailData } from "../../features/artwork/helpers";
import FanLetterSendModal from "../../features/fanLetter/ui/FanLetterSendModal";
import "./artworkDetail.css";

type Props = {
  artwork: ArtworkDetailData | null;
  similarArtworks: readonly ArtworkBase[];
  recommendArtworks: readonly ArtworkBase[];

  isLoading: boolean;
  imageError: boolean;
  isFollowing: boolean;
  isLiked: boolean;
  likeCount: number;
  comments: Comment[];

  setImageError: (v: boolean) => void;
  onToggleFollow: () => void;
  onLike: () => void;
  onAddComment: (content: string) => void;
  onAddReply: (parentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, newContent: string) => void;
  onGoHome: () => void;
  onNavigateArtwork: (artworkId: string) => void;
  profilePath: (authorId: string) => string;

  // ✅ FanLetter
  fanLetterOpen: boolean;
  fanLetterSending: boolean;
  onOpenFanLetter: () => void;
  onCloseFanLetter: () => void;
  onSendFanLetter: (content: string) => void;
};

export function ArtworkDetailView({
  artwork,
  similarArtworks,
  recommendArtworks,
  isLoading,
  imageError,
  isFollowing,
  isLiked,
  likeCount,
  comments,
  setImageError,
  onToggleFollow,
  onLike,
  onAddComment,
  onAddReply,
  onDeleteComment,
  onUpdateComment,
  onGoHome,
  onNavigateArtwork,
  profilePath,

  fanLetterOpen,
  fanLetterSending,
  onOpenFanLetter,
  onCloseFanLetter,
  onSendFanLetter,
}: Props) {
  if (isLoading) {
    return (
      <div className="artwork-loading">
        <div className="spinner" />
        <span className="loading-text">Loading Masterpiece...</span>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="artwork-error">
        <h2 className="error-title">Artwork Not Found</h2>
        <button className="back-btn" onClick={onGoHome}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="artwork-detail-page">
      <section className="artwork-hero">
        <div className="hero-content">
          <div className="hero-header">
            <h1 className="hero-title">{artwork.title}</h1>
            <div className="hero-artist">
              <span className="by">by</span>
              <span className="name">{artwork.artist}</span>
            </div>
          </div>

          <div className="hero-frame">
            {imageError ? (
              <div className="image-fallback">Image Not Available</div>
            ) : (
              <img
                src={artwork.src}
                alt={artwork.title}
                className="hero-img"
                onError={() => setImageError(true)}
              />
            )}
            <div className="frame-shadow" />
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll to Discover</span>
          <div className="scroll-line" />
        </div>
      </section>

      <div className="artwork-body">
        <div className="action-bar">
          <div className="action-left">
            <button className={`follow-btn ${isFollowing ? "active" : ""}`} onClick={onToggleFollow}>
              {isFollowing ? "Following" : "+ Follow Artist"}
            </button>
          </div>

          <div className="action-right">
            {/* ✅ Fan Letter 버튼 */}
            <button className="fanletter-btn" onClick={onOpenFanLetter}>
              Fan Letter
            </button>

            <button className={`like-btn ${isLiked ? "active" : ""}`} onClick={onLike}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{likeCount}</span>
            </button>

            <button className="share-btn">Share</button>
          </div>
        </div>

        <div className="info-section">
          <h3 className="section-label">Description</h3>
          <p className="desc-text">{artwork.description}</p>

          <div className="tags-row">
            {artwork.tags.map((tag, i) => (
              <span key={i} className="tag-pill">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="comments-section">
          <h3 className="section-label">
            Comments <span className="count">({comments.length})</span>
          </h3>
          <CommentForm placeholder="Leave a thought on this piece..." onAdd={onAddComment} />
          <CommentList
            comments={comments}
            onDelete={onDeleteComment}
            onUpdate={onUpdateComment}
            onAddReply={onAddReply}
            profilePath={profilePath}
          />
        </div>

        <div className="discovery-section">
          <h3 className="section-heading">More to Explore</h3>

          <div className="grid-group">
            <div className="grid-label">Similar Style</div>
            <div className="artwork-grid">
              {similarArtworks.map((item) => (
                <div key={item.id} className="grid-card" onClick={() => onNavigateArtwork(String(item.id))}>
                  <img src={item.src} alt="artwork" loading="lazy" />
                  <div className="card-overlay">
                    <span>View Artwork</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-group">
            <div className="grid-label">Curated for You</div>
            <div className="artwork-grid">
              {recommendArtworks.map((item) => (
                <div key={item.id} className="grid-card" onClick={() => onNavigateArtwork(String(item.id))}>
                  <img src={item.src} alt="artwork" loading="lazy" />
                  <div className="card-overlay">
                    <span>View Artwork</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FanLetter Modal */}
      <FanLetterSendModal
        open={fanLetterOpen}
        sending={fanLetterSending}
        artworkTitle={artwork.title}
        artistName={artwork.artist}
        onClose={onCloseFanLetter}
        onSend={onSendFanLetter}
      />
    </div>
  );
}
