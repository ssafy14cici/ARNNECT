import React from 'react';
import './FeedCard.css';

// ✅ 1. 타입 정의
export type ViewMode = 'GRID' | 'LIST';
export type FeedRole = 'ARTIST' | 'USER';
export type postRole = 'ARTWORK' | 'REVIEW'; // 이 타입을 활용합니다.

export interface FeedData {
  id: string;
  role: FeedRole;     // 'ARTIST' 또는 'USER'
  title: string;
  excerpt?: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  imageUrl?: string;
  // category?: string; // 로직으로 처리하므로 이 필드는 굳이 필요 없으나, 데이터에 있다면 유지해도 됩니다.
  likes?: number;
  views?: number;
}

interface FeedCardProps {
  feed: FeedData;
  viewMode: ViewMode;
  onClick?: () => void;
  onAuthorClick?: (e: React.MouseEvent) => void;
}

// --- Helper Functions ---
function formatDate(isoString?: string) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function BadgeIcon({ role }: { role?: string }) {
  if (role === 'ARTIST') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3 7h7l-5 5 2 7-7-4-7 4 2-7-5-5h7z" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </svg>
  );
}

// --- Component ---
export const FeedCard: React.FC<FeedCardProps> = ({ 
  feed, 
  viewMode, 
  onClick, 
  onAuthorClick 
}) => {
  // imageUrl이 있는지 여부 확인
  const hasImage = Boolean(feed.imageUrl);

  // ✅ 2. role에 따라 카테고리 텍스트 결정 (postRole 타입 사용)
  const categoryLabel: postRole = feed.role === 'ARTIST' ? 'ARTWORK' : 'REVIEW';

  return (
    <article 
      className={`feed-card ${hasImage ? '' : 'no-image'} ${viewMode === 'LIST' ? 'mode-list' : 'mode-grid'}`}
      onClick={onClick}
    >
      {/* 1. 이미지 영역 */}
      <div className="card-img-box">
        {/* 뱃지 */}
        <div className={`card-badge ${feed.role === 'ARTIST' ? 'artist' : 'user'}`}>
          <BadgeIcon role={feed.role} />
        </div>

        {hasImage ? (
          <img className="card-img" src={feed.imageUrl} alt={feed.title} loading="lazy" />
        ) : (
          <div className="card-placeholder">
            <span>NO IMAGE</span>
          </div>
        )}
      </div>

      {/* 2. 정보 영역 */}
      <div className="card-info">
        <h3 className="card-title">{feed.title}</h3>

        <div className="card-meta">
          {/* ✅ 3. 결정된 카테고리 텍스트 출력 */}
          <span className="card-cat">{categoryLabel}</span>
          
          {/* 리스트 모드일 때만 요약글 표시 */}
          {viewMode === 'LIST' && feed.excerpt && (
            <span className="card-desc">{feed.excerpt}</span>
          )}
        </div>

        <div className="card-footer">
          <button 
            className="author-link"
            onClick={(e) => {
              e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
              onAuthorClick?.(e);
            }}
          >
            {feed.authorName}
          </button>
          
          <div className="card-footer-right">
            <span className="card-date">{formatDate(feed.createdAt)}</span>
            <span className="card-stats">♥ {feed.likes || 0}</span>
          </div>
        </div>
      </div>
    </article>
  );
};