
// src/pages/feed/Feed.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./feed.css";

/**
 * 혼합 피드 엔트리 타입
 * - kind로 카드 렌더링을 분기합니다.
 */
type FeedEntry =
  | {
      kind: "artwork";
      id: string; // ✅ key 중복 방지: "artwork_123" 같은 전역 유니크 권장
      artworkId: string; // /artworks/:id 이동용
      title: string; // 작품명(필수)
      genre: string; // 장르(필수)
      imageUrl: string; // 카드 이미지(필수)
      author: { id: string; name: string; type: "artist" };
    }
  | {
      kind: "post";
      id: string; // ✅ key 중복 방지: "post_456" 같은 전역 유니크 권장
      postId: string; // /posts/:id 이동용
      text: string; // 텍스트(필수)
      imageUrl?: string; // 이미지(선택)
      author: { id: string; name: string; type: "user" | "artist" };
    };

const PAGE_SIZE = 12;

/**
 * TODO(추후 논의):
 * - 실제 API에서는 cursor 기반 or page 기반으로 바꿀 수 있습니다.
 * - 지금은 page 기반 mock으로 무한스크롤 느낌만 냅니다.
 */
function makeMockMixedFeed(page: number, size: number): FeedEntry[] {
  const baseImgs = [
    "/art/a1.jpg",
    "/art/a2.jpg",
    "/art/a3.jpg",
    "/art/a4.jpg",
    "/art/a5.jpg",
    "/art/a6.jpg",
    "/art/a7.jpg",
    "/art/a8.jpg",
  ];

  const start = page * size;

  return Array.from({ length: size }).map((_, i) => {
    const idx = start + i;

    // 2:1 비율로 artwork/post 섞기 (원하면 비율 조정)
    const isArtwork = idx % 3 !== 2;

    if (isArtwork) {
      const img = baseImgs[idx % baseImgs.length];
      const artworkId = String(1000 + idx); // ✅ 지금 프로젝트에서 /artworks/:id를 1000번대로 쓰는 흐름에 맞춤
      return {
        kind: "artwork",
        id: `artwork_${artworkId}`, // ✅ React key 안전
        artworkId,
        title: `Artwork Title #${idx + 1}`,
        genre: ["Painting", "Film", "Photo", "Sculpture"][idx % 4],
        imageUrl: img,
        author: {
          id: String((idx % 7) + 1),
          name: `Artist ${(idx % 7) + 1}`,
          type: "artist",
        },
      };
    }

    // post
    const hasImage = idx % 2 === 0; // 절반은 이미지 없음
    const postId = String(5000 + idx);
    return {
      kind: "post",
      id: `post_${postId}`, // ✅ React key 안전
      postId,
      text: `오늘의 감상 기록 #${idx + 1} — 텍스트는 나중에 clamp 줄수로 조정`,
      imageUrl: hasImage ? baseImgs[idx % baseImgs.length] : undefined,
      author: {
        id: String((idx % 9) + 1),
        name: `User ${(idx % 9) + 1}`,
        type: idx % 5 === 0 ? "artist" : "user", // 가끔 artist post도 섞임(혼합 피드 느낌)
      },
    };
  });
}

/** 우측 상단 마크(아이콘) - 임시 SVG, 나중에 디자인 교체 가능 */
function CornerBadgeIcon({ variant }: { variant: "artist" | "user" }) {
  return (
    <span className={`feedBadge ${variant}`} aria-label={variant === "artist" ? "artist post" : "user post"}>
      {/* 간단한 아이콘 (나중에 바꾸기 쉬움) */}
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        {variant === "artist" ? (
          // ⭐ 느낌의 아이콘
          <path d="M12 2l2.9 6.3 6.8.6-5.1 4.4 1.6 6.7L12 16.9 5.8 20l1.6-6.7L2.3 8.9l6.8-.6L12 2z" />
        ) : (
          // 👤 느낌의 아이콘
          <path d="M12 12c2.8 0 5-2.2 5-5S14.8 2 12 2 7 4.2 7 7s2.2 5 5 5zm0 2c-4.1 0-8 2-8 5v3h16v-3c0-3-3.9-5-8-5z" />
        )}
      </svg>
    </span>
  );
}

export default function Feed() {
  const navigate = useNavigate();

  const [items, setItems] = useState<FeedEntry[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchNext = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    // TODO(API 붙일 때):
    // - cursor/page/size 정책 결정 후 여기에 연결
    // - 실패 시 throw -> catch에서 에러 UI 표시 가능

    await new Promise((r) => setTimeout(r, 350));
    const next = makeMockMixedFeed(page, PAGE_SIZE);

    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);

    // 데모는 무한 로드 유지
    setHasMore(true);
    setLoading(false);
  };

  // 최초 로드
  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무한 스크롤
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNext();
      },
      { root: null, rootMargin: "700px 0px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, loading, hasMore]);

  // ✅ 카드 클릭 라우팅 규칙
  const onClickCard = (it: FeedEntry) => {
    if (it.kind === "artwork") {
      // 작가 카드 클릭 → 작품 상세
      navigate(`/artworks/${it.artworkId}`);
      return;
    }
    // 유저 게시글 카드 클릭 → 게시글 상세(없으면 임시로 만들어 둠)
    navigate(`/posts/${it.postId}`);
  };

  // ✅ 공통: 작성자 클릭 → 프로필로 이동
  // (현재 프로젝트 라우트는 /profile/:id/feed 형태로 쓰고 있어서 그쪽으로 보냄)
  const onClickAuthor = (authorId: string) => {
    navigate(`/profile/${authorId}/feed`);
  };

  const headerNav = useMemo(
    () => ["ARCHITECTURE", "INTERIORS", "DANCE", "CONTACT"],
    []
  );

  return (
    <section className="feed">
      <div className="feedHeader">
        <div className="feedLeft">
          <nav className="feedNav">
            {headerNav.map((t) => (
              <button key={t} type="button" className="feedNavItem">
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div className="feedTitle">Arnnect Feed</div>
      </div>

      <div className="feedGrid" role="list">
        {items.map((it) => {
          const badgeVariant =
            it.kind === "artwork" ? "artist" : it.author.type === "artist" ? "artist" : "user";

          return (
            <button
              key={it.id} // ✅ 전역 유니크 key
              type="button"
              className={`feedCard ${it.kind === "post" && !it.imageUrl ? "feedCardTextOnly" : ""}`}
              onClick={() => onClickCard(it)}
              aria-label="피드 카드"
            >
              <div className="feedImgWrap">
                {/* 이미지가 없는 post는 텍스트 카드처럼 */}
                {it.kind === "post" && !it.imageUrl ? (
                  <div className="feedTextOnly">
                    <div className="feedTextOnlyTop">
                      <CornerBadgeIcon variant={badgeVariant} />
                    </div>

                    <div className="feedTextOnlyBody">
                      <div className="feedTextClamp">{it.text}</div>
                    </div>

                    <button
                      type="button"
                      className="feedAuthor"
                      onClick={(e) => {
                        e.stopPropagation(); // ✅ 카드 클릭과 분리
                        onClickAuthor(it.author.id);
                      }}
                      aria-label="작성자 프로필로 이동"
                    >
                      {it.author.name}
                    </button>
                  </div>
                ) : (
                  <>
                    <img
                      className="feedImg"
                      src={it.kind === "artwork" ? it.imageUrl : (it.imageUrl as string)}
                      alt={it.kind === "artwork" ? it.title : it.text}
                      loading="lazy"
                    />

                    {/* 우측 상단 마크(아이콘) */}
                    <CornerBadgeIcon variant={badgeVariant} />

                    {/* Hover overlay: 기존 스타일 유지 + 최소 정보 표시 */}
                    <div className="feedOverlay">
                      <div className="feedOverlayText">
                        {it.kind === "artwork" ? (
                          <>
                            <div className="feedOverlayTitle">{it.title}</div>
                            <div className="feedOverlayMeta">{it.genre}</div>
                          </>
                        ) : (
                          <>
                            <div className="feedOverlayTitle feedTextClamp">{it.text}</div>
                            <div className="feedOverlayMeta">{it.author.name}</div>
                          </>
                        )}

                        {/* 작성자 클릭(공통) */}
                        <button
                          type="button"
                          className="feedAuthor"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClickAuthor(it.author.id);
                          }}
                          aria-label="작성자 프로필로 이동"
                        >
                          {it.author.name}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 센티넬 */}
      <div ref={sentinelRef} className="feedSentinel" />

      {/* ✅ 하단 로딩만 */}
      {loading ? <div className="feedLoading">Loading…</div> : null}
    </section>
  );
}
