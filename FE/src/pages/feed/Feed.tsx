import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./feed.css";

/**
 * 라우팅 경로는 프로젝트에 맞게 수정하세요.
 */
const DETAIL_PATH = (id: string) => `/feed/${id}`;
const PROFILE_PATH = (authorId: string) => `/profile/${authorId}`;

type FeedRole = "ARTIST" | "USER";

type FeedItem = {
  id: string;
  role: FeedRole;
  title: string;
  excerpt?: string;
  authorName: string;
  authorId: string;
  createdAt: string; // ISO
  imageUrl?: string | null;
  category?: string;
};

type FeedFilterKey = "ALL" | "ARTIST" | "USER";

const FILTERS: Array<{ key: FeedFilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ARTIST", label: "Artist" },
  { key: "USER", label: "User" },
];

// 무한 스크롤 데모용 페이지 사이즈
const PAGE_SIZE = 12;

/**
 * TODO: API 붙이기 전 임시 데이터
 * - imageUrl이 없으면 "텍스트-only 카드"
 */
const MOCK_FEEDS: FeedItem[] = [
  {
    id: "1",
    role: "ARTIST",
    title: "Nocturne Study",
    excerpt: "A short note about the painting concept and composition.",
    authorName: "A. Kim",
    authorId: "artist-1",
    createdAt: "2026-01-22T09:00:00.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=1200&q=80",
    category: "Painting",
  },
  {
    id: "2",
    role: "USER",
    title: "My First Gallery Visit",
    excerpt: "I discovered a new artist today and wanted to share the mood.",
    authorName: "U. Park",
    authorId: "user-9",
    createdAt: "2026-01-22T10:20:00.000Z",
    imageUrl: null,
    category: "Essay",
  },
  {
    id: "3",
    role: "ARTIST",
    title: "Ceramic Form #12",
    excerpt: "Texture experiments with layered glazing.",
    authorName: "S. Lee",
    authorId: "artist-2",
    createdAt: "2026-01-21T15:40:00.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=1200&q=80",
    category: "Craft",
  },
  {
    id: "4",
    role: "USER",
    title: "CollectBook Note",
    excerpt: "Saving inspirations and curating my own small collection.",
    authorName: "U. Choi",
    authorId: "user-3",
    createdAt: "2026-01-21T12:05:00.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1520697222860-7a90cbf31d82?auto=format&fit=crop&w=1200&q=80",
    category: "Collection",
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function roleLabel(role: FeedRole) {
  return role === "ARTIST" ? "ARTIST" : "USER";
}

function stop(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function BadgeIcon({ role }: { role: FeedRole }) {
  if (role === "ARTIST") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.6 1.7 6.9L12 17.8 5.7 20.7l1.7-6.9L2 9.2l7.1-.6L12 2z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  );
}

export default function Feed() {
  const navigate = useNavigate();

  // TODO: API 붙이면 feeds를 fetch 결과로 교체
  const [feeds] = useState<FeedItem[]>(MOCK_FEEDS);

  const [filter, setFilter] = useState<FeedFilterKey>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const filteredFeeds = useMemo(() => {
    if (filter === "ALL") return feeds;
    if (filter === "ARTIST") return feeds.filter((f) => f.role === "ARTIST");
    return feeds.filter((f) => f.role === "USER");
  }, [feeds, filter]);

  const visibleFeeds = useMemo(() => {
    return filteredFeeds.slice(0, visibleCount);
  }, [filteredFeeds, visibleCount]);

  const hasMore = visibleCount < filteredFeeds.length;

  // ✅ ESLint(rule: react-hooks/set-state-in-effect) 회피:
  // filter 변경 시 visibleCount 초기화는 useEffect가 아니라 "이벤트 핸들러"에서 처리
  const applyFilter = (next: FeedFilterKey) => {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  };

  // 무한 스크롤 옵저버
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!hasMore) return;

        // ✅ effect body가 아니라 "observer callback"에서 setState -> lint 통과
        setVisibleCount((prev) => prev + PAGE_SIZE);
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 }
    );

    observerRef.current.observe(el);

    return () => observerRef.current?.disconnect();
  }, [hasMore]);

  const goDetail = (id: string) => navigate(DETAIL_PATH(id));
  const goProfile = (authorId: string) => navigate(PROFILE_PATH(authorId));

  const onCardKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goDetail(id);
    }
  };

  return (
    <div className="feed">
      <header className="feedHeader">
        <div className="feedLeft">
          <nav className="feedNav" aria-label="feed filter">
            {FILTERS.map((f) => {
              const active = f.key === filter;

              return (
                <button
                  key={f.key}
                  type="button"
                  className="feedNavItem"
                  onClick={() => applyFilter(f.key)}
                  aria-current={active ? "page" : undefined}
                  style={
                    active
                      ? { opacity: 1, fontWeight: 700 }
                      : { opacity: 0.7, fontWeight: 400 }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </nav>
        </div>

        <h1 className="feedTitle">FEED</h1>

        <div />
      </header>

      <section className="feedGrid" aria-label="feed grid">
        {visibleFeeds.map((item) => {
          const hasImage = Boolean(item.imageUrl);

          return (
            <article
              key={item.id}
              className={`feedCard ${hasImage ? "" : "feedCardTextOnly"}`.trim()}
              role="button"
              tabIndex={0}
              aria-label={`Open feed: ${item.title}`}
              onClick={() => goDetail(item.id)}
              onKeyDown={(e) => onCardKeyDown(e, item.id)}
            >
              <div className="feedImgWrap">
                {/* Badge */}
                <div
                  className={`feedBadge ${
                    item.role === "ARTIST" ? "artist" : "user"
                  }`}
                  aria-label={roleLabel(item.role)}
                  title={roleLabel(item.role)}
                >
                  <BadgeIcon role={item.role} />
                </div>

                {/* Image or Text-only */}
                {hasImage ? (
                  <img
                    className="feedImg"
                    src={item.imageUrl as string}
                    alt={item.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="feedTextOnly">
                    <div className="feedTextOnlyTop" />
                    <div className="feedTextOnlyBody">
                      <div className="feedTextClamp">{item.title}</div>
                      {item.excerpt ? (
                        <div className="feedTextClamp">{item.excerpt}</div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="feedOverlay">
                  <div className="feedOverlayText">
                    <div className="feedOverlayTitle feedTextClamp">
                      {item.title}
                    </div>

                    <div className="feedOverlayMeta">
                      {item.category ? `${item.category} • ` : ""}
                      {formatDate(item.createdAt)}
                    </div>

                    {/* 작성자 버튼: 카드 클릭(상세)과 분리 */}
                    <button
                      type="button"
                      className="feedAuthor"
                      onClick={(e) => {
                        stop(e);
                        goProfile(item.authorId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") stop(e);
                      }}
                      aria-label={`Open profile: ${item.authorName}`}
                    >
                      {item.authorName}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Sentinel */}
      <div ref={sentinelRef} className="feedSentinel" />

      {/* Loading / End */}
      <div className="feedLoading" aria-live="polite">
        {hasMore ? "LOADING MORE..." : "END"}
      </div>
    </div>
  );
}
