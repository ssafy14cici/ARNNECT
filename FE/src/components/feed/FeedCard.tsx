// src/components/FeedCard.tsx

import React from 'react';
import { Feed } from '../../data/mockFeeds';
import './FeedCard.css';  // ← 이 줄 추가

// ... 나머지 코드 동일
interface FeedCardProps {
  feed: Feed;
}

export const FeedCard: React.FC<FeedCardProps> = ({ feed }) => {
  return (
    <div className="feed-card">
      {/* 썸네일 영역 */}
      <div className="feed-card__thumbnail">
        <img src={feed.thumbnail} alt={feed.title} />
      </div>

      {/* 정보 영역 */}
      <div className="feed-card__info">
        {/* 제목 */}
        <h3 className="feed-card__title">{feed.title}</h3>

        {/* 작가 정보 */}
        <div className="feed-card__artist">
          <img 
            src={feed.artistProfile} 
            alt={feed.artist}
            className="feed-card__artist-profile"
          />
          <span className="feed-card__artist-name">{feed.artist}</span>
        </div>

        {/* 통계 정보 */}
        <div className="feed-card__stats">
          <span className="feed-card__likes">❤️ {feed.likes}</span>
          <span className="feed-card__views">👁️ {feed.views}</span>
        </div>
      </div>
    </div>
  );
};