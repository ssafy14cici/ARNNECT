// FE/src/pages/feed/Feed.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./feed.css";

/**
 * 라우팅 경로는 프로젝트에 맞게 수정하세요.
 */
const DETAIL_PATH = (id: string) => `/artworks/${id}`;
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

  // 있으면 UI에 붙여도 됨(원하면 제거 가능)
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

/** ✅ public/art 폴더 이미지 풀 */
const ART_IMAGES = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

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

/** ✅ 더미 피드 자동 생성 (이미지 10~12장 반복 사용) */
function buildMockFeeds(total = 48): FeedItem[] {
  const artistNames = ["A. KIM", "S. LEE", "J. PARK", "H. CHOI"];
  const userNames = ["U. PARK", "U. CHOI", "U. KANG", "U. HAN"];
  const cats = ["Painting", "Photo", "Craft", "Design", "Essay", "Collection"];

  return Array.from({ length: total }).map((_, idx) => {
    const role: FeedRole = idx % 2 === 0 ? "ARTIST" : "USER";
    const isTextOnly = idx % 6 === 0; // 6개 중 1개는 텍스트-only

    const authorName =
      role === "ARTIST"
        ? artistNames[idx % artistNames.length]
        : userNames[idx % userNames.length];

    const authorId =
      role === "ARTIST" ? `artist-${(idx % 6) + 1}` : `user-${(idx % 10) + 1}`;

    const imageUrl = isTextOnly ? null : ART_IMAGES[idx % ART_IMAGES.length];

    // 최근 날짜로 분산
    const createdAt = new Date(Date.now() - idx * 6 * 60 * 60 * 1000).toISOString();

    return {
      id: String(idx + 1),
      role,
      title: role === "ARTIST" ? `Artwork #${idx + 1}` : `User Log #${idx + 1}`,
      excerpt:
        role === "USER"
          ? "유저 기록/리뷰 더미 텍스트입니다."
          : "작품 소개 더미 텍스트입니다.",
      authorName,
      authorId,
      createdAt,
      imageUrl,
      category: cats[idx % cats.length],
      likes: Math.floor(Math.random() * 500),
      views: 100 + Math.floor(Math.random() * 9000),
    };
  });
}

export default function Feed() {
  const navigate = useNavigate();

  /** ✅ 기존처럼 컴포넌트 내부에서 바로 더미 사용 */
  const [feeds] = useState<FeedItem[]>(() => buildMockFeeds(60));

  const [filter, setFilter] = useState<FeedFilterKey>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const filteredFeeds = useMemo(() => {
    if (filter === "ALL") return feeds;
    if (filter === "ARTIST") return feeds.filter((f) => f.role === "ARTIST");
    return feeds.filter((f) => f.role === "USER");
  }, [feeds, filter]);

  const visibleFeeds = useMemo(() => filteredFeeds.slice(0, visibleCount), [filteredFeeds, visibleCount]);
  const hasMore = visibleCount < filteredFeeds.length;

  const applyFilter = (next: FeedFilterKey) => {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!hasMore) return;

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
                  style={active ? { opacity: 1, fontWeight: 700 } : { opacity: 0.7, fontWeight: 400 }}
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
                  className={`feedBadge ${item.role === "ARTIST" ? "artist" : "user"}`}
                  aria-label={roleLabel(item.role)}
                  title={roleLabel(item.role)}
                >
                  <BadgeIcon role={item.role} />
                </div>

                {/* Image or Text-only */}
                {hasImage ? (
                  <img className="feedImg" src={item.imageUrl as string} alt={item.title} loading="lazy" />
                ) : (
                  <div className="feedTextOnly">
                    <div className="feedTextOnlyTop" />
                    <div className="feedTextOnlyBody">
                      <div className="feedTextClamp">{item.title}</div>
                      {item.excerpt ? <div className="feedTextClamp">{item.excerpt}</div> : null}
                    </div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="feedOverlay">
                  <div className="feedOverlayText">
                    <div className="feedOverlayTitle feedTextClamp">{item.title}</div>

                    <div className="feedOverlayMeta">
                      {item.category ? `${item.category} • ` : ""}
                      {formatDate(item.createdAt)}
                      {typeof item.views === "number" ? ` • 👁 ${item.views}` : ""}
                      {typeof item.likes === "number" ? ` • ♥ ${item.likes}` : ""}
                    </div>

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

      <div ref={sentinelRef} className="feedSentinel" />

      <div className="feedLoading" aria-live="polite">
        {hasMore ? "LOADING MORE..." : "END"}
      </div>
    </div>
  );
}
