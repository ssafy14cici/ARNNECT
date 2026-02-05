// FE/src/features/feed/ui/FeedCard.tsx
import React from "react";
import "./FeedCard.css";

import type { FeedAuthorRole, FeedItem, ViewMode } from "../model/types";

/* helpers */
function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BadgeIcon({ role }: { role: FeedAuthorRole }) {
  return role === "ARTIST" ? (
    <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
      <path d="M12 2l3 7h7l-5 5 2 7-7-4-7 4 2-7-5-5h7z" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </svg>
  );
}

// ✅ category는 서버에서 확정 안 됐으니, 화면용으로만 추론
type PostCategory = "ARTWORK" | "REVIEW";
function inferCategory(feed: FeedItem): PostCategory {
  // id prefix가 있으면 그걸 우선
  if (feed.id.startsWith("artwork-")) return "ARTWORK";
  if (feed.id.startsWith("review-")) return "REVIEW";
  // 없으면 role 기반으로 fallback (기존 UI 의도 유지)
  return feed.authorRole === "ARTIST" ? "ARTWORK" : "REVIEW";
}

type FeedCardProps = {
  feed: FeedItem;
  viewMode: ViewMode;
  onClick?: () => void;
  onAuthorClick?: (e: React.MouseEvent) => void;
};

export const FeedCard: React.FC<FeedCardProps> = ({ feed, viewMode, onClick, onAuthorClick }) => {
  const hasImage = Boolean(feed.imageUrl);
  const category = inferCategory(feed);

  return (
    <article
      className={`feed-card ${hasImage ? "" : "no-image"} ${viewMode === "LIST" ? "mode-list" : "mode-grid"}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick?.();
      }}
    >
      {/* image */}
      <div className="card-img-box">
        {/* badge */}
        <div className={`card-badge ${feed.authorRole === "ARTIST" ? "artist" : "user"}`}>
          <BadgeIcon role={feed.authorRole} />
        </div>

        {hasImage ? (
          // ✅ className="card-img" 추가 (CSS 적용되게)
          <img className="card-img" src={feed.imageUrl} alt={feed.title} loading="lazy" />
        ) : (
          <div className="card-placeholder">NO IMAGE</div>
        )}
      </div>

      {/* info */}
      <div className="card-info">
        <h3 className="card-title">{feed.title}</h3>

        <div className="card-meta">
          <span className="card-cat">{category}</span>
          {viewMode === "LIST" && feed.excerpt ? <span className="card-desc">{feed.excerpt}</span> : null}
        </div>

        <div className="card-footer">
          <button
            type="button"
            className="author-link"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick?.(e);
            }}
          >
            {feed.authorName}
          </button>

          <div className="card-footer-right">
            <span>{formatDate(feed.createdAt)}</span>
            <span>♥ {feed.likes ?? 0}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
