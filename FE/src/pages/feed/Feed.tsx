import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FeedCard, ViewMode, FeedRole, FeedData } from "../../components/feed/FeedCard";
import { useAuthStore } from "../../features/auth/store";
import { listPosts, ensureBaseSeedOnce } from "../../features/feed/mockData";
import "./feed.css";

ensureBaseSeedOnce();

const ARTWORK_PATH = (id: string) => `/artworks/${id}`;
const POST_PATH = (id: string) => `/posts/${id}`;
const PROFILE_PATH = (id: string) => `/profile/${id}`;

const PAGE_SIZE = 12;

function pickExcerpt(content?: string, max = 120) {
  if (!content) return;
  const s = content.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function mapPosts(): FeedData[] {
  return listPosts().map((p: any) => ({
    id: p.id,
    role: p.role === "ARTIST" ? "ARTIST" : "USER",
    title: p.title,
    excerpt: pickExcerpt(p.content),
    authorName: p.authorName,
    authorId: p.authorId,
    createdAt: p.createdAt,
    imageUrl: p.imageUrls?.[0],
    likes: p.likes,
    views: p.views,
  }));
}

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  void location.key;

  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feeds = mapPosts().slice(0, visibleCount);
  const hasMore = visibleCount < listPosts().length;

  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && hasMore) {
        setVisibleCount((v) => v + PAGE_SIZE);
      }
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore]);

  const goDetail = (id: string, role: FeedRole) => {
    navigate(role === "ARTIST" ? ARTWORK_PATH(id) : POST_PATH(id));
  };

  const goProfile = (id: string) => navigate(PROFILE_PATH(id));

  return (
    <div className="feedPage">
      <section className={`feedContainer ${viewMode === "LIST" ? "mode-list" : "mode-grid"}`}>
        {feeds.map((item) => (
          <FeedCard
            key={item.id}
            feed={item}
            viewMode={viewMode}
            onClick={() => goDetail(item.id, item.role)}
            onAuthorClick={() => goProfile(item.authorId)}
          />
        ))}
      </section>

      <div ref={sentinelRef} />
    </div>
  );
}
