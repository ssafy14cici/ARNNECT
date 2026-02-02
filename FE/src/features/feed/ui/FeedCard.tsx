// FE/src/components/feed/FeedCard.tsx

import React from 'react';
import './FeedCard.css';
import type { FeedItem, ViewMode } from "../types"; 

interface FeedCardProps {
  feed: FeedItem;
  viewMode: ViewMode;
  onClick?: () => void;
  onAuthorClick?: (e: React.MouseEvent) => void;
}

/* helpers */
function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BadgeIcon({ role }: { role: FeedRole }) {
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

export const FeedCard: React.FC<FeedCardProps> = ({
  feed,
  viewMode,
  onClick,
  onAuthorClick,
}) => {
  const hasImage = Boolean(feed.imageUrl);
  const category: PostCategory = feed.role === "ARTIST" ? "ARTWORK" : "REVIEW";

  return (
    <article
      className={`feed-card ${hasImage ? "" : "no-image"} ${
        viewMode === "LIST" ? "mode-list" : "mode-grid"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* image */}
      <div className="card-img-box">
        {/* 뱃지 */}
        <div className={`card-badge ${feed.authorRole === "ARTIST" ? "artist" : "user"}`}>
          <BadgeIcon role={feed.authorRole} />
        </div>
        {hasImage ? (
          <img src={feed.imageUrl} alt={feed.title} loading="lazy" />
        ) : (
          <div className="card-placeholder">NO IMAGE</div>
        )}
      </div>

      {/* info */}
      <div className="card-info">
        <h3 className="card-title">{feed.title}</h3>

        <div className="card-meta">
          <span className="card-cat">{category}</span>
          {viewMode === "LIST" && feed.excerpt && (
            <span className="card-desc">{feed.excerpt}</span>
          )}
        </div>

        <div className="card-footer">
          <button
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
