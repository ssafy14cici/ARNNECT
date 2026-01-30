// FE/src/pages/feed/Feed.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FeedCard, type ViewMode } from "../../components/feed/FeedCard";
import { useAuthStore } from "../../features/auth/store";
import { listPosts, ensureBaseSeedOnce } from "../../features/feed/mockData";
import "./feed.css";


ensureBaseSeedOnce();


const ARTWORK_PATH = (id: string) => `/artworks/${id}`;
const POST_PATH = (id: string) => `/posts/${id}`; 

const PROFILE_PATH = (authorId: string) => `/profile/${authorId}`;

export type FeedRole = "ARTIST" | "USER";

type FeedItem = {
  id: string;
  role: FeedRole;
  title: string;
  excerpt?: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  imageUrl?: string;
  likes?: number;
  views?: number;
};

type FeedFilterKey = "ALL" | "ARTIST" | "USER";

const FILTERS: Array<{ key: FeedFilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ARTIST", label: "Artist" },
  { key: "USER", label: "User" },
];

const PAGE_SIZE = 12;

// ✅ FE/public/art/a1.jpg ... a12.jpg
const ART_IMAGES = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

function pickExcerpt(content?: string, max = 120) {
  if (!content) return undefined;
  const s = content.replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// ✅ 최초 1회: 기본 더미(공용) 생성
const BASE_SEED_KEY = "comet_mock_posts_seeded_v1";

// ✅ 로그인 유저별 1회: 내 글 더미 생성
const MY_SEED_PREFIX = "comet_mock_my_posts_seeded_v1";

function mapPostsToFeeds(): FeedItem[] {
  return listPosts()
    .map((p: any): FeedItem => ({
      id: p.id,
      role: p.role,
      title: p.title,
      excerpt: pickExcerpt(p.content),
      authorName: p.authorName,
      authorId: p.authorId,
      createdAt: p.createdAt,
      imageUrl: (Array.isArray(p.imageUrls) ? p.imageUrls[0] : undefined) ?? p.imageUrl,

      likes: p.likes,
      views: p.views,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}


export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const appRole = useAuthStore((s) => s.role); // "general" | "artist" | null
  const user = useAuthStore((s) => s.user); // { memberUuid, name } | null

  const [filter, setFilter] = useState<FeedFilterKey>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);



  const me =
    isLoggedIn && user
      ? ({
          id: user.memberUuid,
          name: user.name,
          role: appRole === "artist" ? "ARTIST" : "USER",
        } as const)
      : null;

  // ✅ PostCreate 갔다가 돌아오면 보통 Feed가 리마운트/리렌더 됨.
  //    혹시 같은 화면 유지되는 케이스 대비로 location.key를 참조해서 리스트 다시 읽음.
  //    (useMemo 없이 그냥 계산)
  void location.key;
  const feeds = mapPostsToFeeds();

  const filteredFeeds =
    filter === "ALL"
      ? feeds
      : filter === "ARTIST"
        ? feeds.filter((f) => f.role === "ARTIST")
        : feeds.filter((f) => f.role === "USER");

  const visibleFeeds = filteredFeeds.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFeeds.length;

  const applyFilter = (next: FeedFilterKey) => {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasMore]);

  const goDetail = (id: string, role: FeedRole) => {
    if (role === "ARTIST") {
      navigate(ARTWORK_PATH(id));
    } else {
      navigate(POST_PATH(id));
    }
  };

  const goProfile = (authorId: string) => navigate(PROFILE_PATH(authorId));

  return (
    <div className="feedPage">
      <header className="feedHeader">
        <h1 className="feedMainTitle">
          <span className="italic-serif">(Art)</span> Gallery
        </h1>

        <p className="feedDesc">
          We invite you to immerse yourself in the essence of culture.
          <br />
          Through artistic expression, master artisans bring to life stories of resilience and beauty.
        </p>

        <div className="feedControls">
          <div className="togglePill">
            <button
              type="button"
              className={`pillBtn ${viewMode === "LIST" ? "active" : ""}`}
              onClick={() => setViewMode("LIST")}
            >
              List
            </button>
            <button
              type="button"
              className={`pillBtn ${viewMode === "GRID" ? "active" : ""}`}
              onClick={() => setViewMode("GRID")}
            >
              Grid
            </button>
          </div>

          <nav className="filterNav">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`filterBtn ${f.key === filter ? "active" : ""}`}
                onClick={() => applyFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className={`feedContainer ${viewMode === "LIST" ? "mode-list" : "mode-grid"}`}>
        {visibleFeeds.map((item) => (
          <FeedCard
            key={item.id}
            feed={item}
            viewMode={viewMode}
            // ✅ onClick에서 role을 확인하여 올바른 경로로 이동
            onClick={() => goDetail(item.id, item.role)}
            onAuthorClick={(e) => {
              e?.stopPropagation?.();
              goProfile(item.authorId);
            }}
          />
        ))}

        {visibleFeeds.length === 0 && (
          <div style={{ padding: 24, opacity: 0.8 }}>아직 표시할 피드가 없습니다.</div>
        )}
      </section>

      <div ref={sentinelRef} className="loadingTrigger" />

      {hasMore && (
        <div className="loadingText">
          <span>LOADING MORE</span>
        </div>
      )}
    </div>
  );
}
