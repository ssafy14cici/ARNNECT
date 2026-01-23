import { CommentForm } from "../../components/artwork/CommentForm";
import { CommentList } from "../../components/artwork/CommentList";
import type { Comment, ArtworkBase, ArtworkDetailData } from "./artworkDetail.helpers";

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

  // ✅ 추가
  profilePath: (authorId: string) => string;
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
}: Props) {
  if (isLoading) {
    return (
      <div className="artworkDetailCenter">
        <div className="loadingText">작품을 불러오는 중...</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="artworkDetailCenter">
        <div className="nfImageWrap">
          <img
            src="/NotFound.png"
            alt="작품을 찾을 수 없음"
            className="nfImage"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <h2 className="nfTitle">작품을 찾을 수 없습니다</h2>
        <p className="nfDesc">요청하신 작품이 존재하지 않거나 삭제되었습니다.</p>

        <button className="primaryBtn" onClick={onGoHome}>
          홈으로 돌아가기
        </button>

        <p className="nfHint">2초 후 자동으로 홈으로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div className="artworkDetailPage">
      <div className="artworkHero">
        {imageError ? (
          <div className="artworkHeroPlaceholder">
            <img
              src="/NotFound.png"
              alt="이미지를 불러올 수 없음"
              className="heroFallbackImage"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <p className="heroFallbackText">이미지를 불러올 수 없습니다</p>
          </div>
        ) : (
          <img
            src={artwork.src}
            alt={artwork.title}
            className="artworkHeroImage"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div className="artworkHeader">
        <h1 className="artworkTitle">{artwork.title}</h1>

        <div className="artworkMetaRow">
          <span className="artworkArtist">{artwork.artist}</span>

          <button className={`followBtn ${isFollowing ? "following" : ""}`} onClick={onToggleFollow} type="button">
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      <div className="artworkActions">
        <button className={`likeBtn ${isLiked ? "liked" : ""}`} onClick={onLike} type="button">
          <svg className="likeIcon" width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount}
        </button>

        <button className="ghostBtn" type="button">
          Send fan letter
        </button>
      </div>

      <section className="descSection">
        <h2 className="sectionTitle">Artwork Description</h2>
        <p className="descText">{artwork.description}</p>
      </section>

      <div className="tagList">
        {artwork.tags.map((tag: string, index: number) => (
          <span className="tagChip" key={`${tag}-${index}`}>
            #{tag}
          </span>
        ))}
      </div>

      <section className="commentsSection">
        <div className="commentsHeader">
          <h3 className="commentsTitle">Comments</h3>
          <span className="commentsCount">({comments.length})</span>
        </div>

        <CommentForm placeholder="Add your comment..." onAdd={onAddComment} />

        <CommentList
          comments={comments}
          onDelete={onDeleteComment}
          onUpdate={onUpdateComment}
          onAddReply={onAddReply}
          profilePath={profilePath}
        />
      </section>

      <section className="gridSection">
        <h3 className="gridTitle">유사한 작품</h3>
        <div className="gridRow">
          {similarArtworks.map((item: any, index: number) => (
            <div key={`similar-${item.id}-${index}`} className="artworkCard" onClick={() => onNavigateArtwork(String(item.id))} role="button" tabIndex={0}>
              <img src={item.src} alt={String(item.id)} className="artworkCardImage" />
              <div className="artworkCardOverlay">
                <div className="overlayTitle">Garsington Opera Pavilion #{String(item.id).replace("a", "")}</div>
                <div className="overlaySub">ARTIST {String(item.id).replace("a", "")}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="gridSection">
        <h3 className="gridTitle">추천 작품</h3>
        <div className="gridRow">
          {recommendArtworks.map((item: any, index: number) => (
            <div key={`recommend-${item.id}-${index}`} className="artworkCard" onClick={() => onNavigateArtwork(String(item.id))} role="button" tabIndex={0}>
              <img src={item.src} alt={String(item.id)} className="artworkCardImage" />
              <div className="artworkCardOverlay">
                <div className="overlayTitle">Garsington Opera Pavilion #{String(item.id).replace("a", "")}</div>
                <div className="overlaySub">ARTIST {String(item.id).replace("a", "")}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
