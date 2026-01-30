import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bumpViews, getPostById } from "../../features/feed/mockData";
import "./feedDetail.css"; // ✅ 새로운 CSS 파일 연결

export default function FeedDetail() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const post = useMemo(() => (id ? getPostById(id) : null), [id]);

  // 페이지 진입 시 스크롤 최상단 이동 & 조회수 증가
  useEffect(() => {
    window.scrollTo(0, 0);
    if (post?.id) bumpViews(post.id);
  }, [post?.id]);

  if (!post) {
    return (
      <div className="feed-detail-page">
        <div className="feed-error">
          <p>게시물을 찾을 수 없습니다.</p>
          <button className="back-btn" onClick={() => nav(-1)}>
            ← Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-detail-page">
      <div className="feed-detail-container">
        
        {/* 1. Navigation */}
        <nav className="detail-nav">
          <button className="back-btn" onClick={() => nav(-1)}>
            &larr; BACK
          </button>
          <div className="detail-nav-right">
            <span className="meta-views">VIEWS {post.views}</span>
          </div>
        </nav>

        {/* 2. Header (Title & Author) */}
        <header className="detail-header fade-in-up">
          <div className="detail-role-badge">{post.role}</div>
          <h1 className="detail-title">{post.title}</h1>
          
          <div className="detail-author-row">
            <span className="meta-date">{post.createdAt.slice(0, 10)}</span>
            <span className="divider">|</span>
            <button 
              className="author-link" 
              onClick={() => nav(`/profile/${post.authorId}`)}
            >
              Created by <span className="author-name">@{post.authorName}</span>
            </button>
          </div>
        </header>

        {/* 3. Hero Image */}
        {post.imageUrls?.[0] && (
          <figure className="detail-image-wrapper fade-in-up delay-1">
            <img 
              src={post.imageUrls[0]} 
              alt={post.title} 
              className="detail-image" 
            />
            {/* 이미지 하단 그라데이션 오버레이 (선택사항) */}
            <div className="image-overlay"></div>
          </figure>
        )}

        {/* 4. Content Body */}
        <article className="detail-content fade-in-up delay-2">
          <p>{post.content}</p>
        </article>

        {/* 5. Tags & Footer */}
        {post.tags?.length ? (
          <footer className="detail-footer fade-in-up delay-3">
            <div className="tag-list">
              {post.tags.map((t) => (
                <span key={t} className="tag-item">#{t}</span>
              ))}
            </div>
          </footer>
        ) : null}
        
      </div>
    </div>
  );
}