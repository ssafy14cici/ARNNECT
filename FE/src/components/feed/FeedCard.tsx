// src/components/feed/FeedCard.tsx
import React from 'react';
import { Feed } from '@/types/feed';
import './FeedCard.css';

interface FeedCardProps {
  feed: Feed;
}

export const FeedCard: React.FC<FeedCardProps> = ({ feed }) => {
  console.log('[FE] FeedCard render:', feed.id);

  return (
    <div className="feed-card">
      {/* 썸네일 */}
      <div className="feed-card__thumbnail">
        <img src={feed.imageUrl} alt={feed.title} />
      </div>

      {/* 정보 */}
      <div className="feed-card__content">
        <h3 className="feed-card__title">{feed.title}</h3>
        <p className="feed-card__author">{feed.authorName}</p>

        <div className="feed-card__meta">
          <span>❤️ {feed.likes}</span>
          <span>👁 {feed.views}</span>
        </div>
      </div>
    </div>
  );
};
