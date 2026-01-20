// export default function Feed() {
//   return <div>Feed (여기에 추천카드 섞기 로직 들어감)</div>;
// }

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./feed.css";

type FeedItem = {
  id: string;
  title: string;
  author?: string;
  // public 기준 경로 (예: /art/a1.jpg)
  imageUrl: string;
};

const PAGE_SIZE = 12;

/**
 * 더미 데이터 생성기
 * - 현재 프로젝트에서 public/art/a1.jpg ~ a8.jpg 쓰고 계셔서 그걸 반복 사용
 */
function makeMockItems(page: number, size: number): FeedItem[] {
  const baseImgs = ["/art/a1.jpg", "/art/a2.jpg", "/art/a3.jpg", "/art/a4.jpg", "/art/a5.jpg", "/art/a6.jpg", "/art/a7.jpg", "/art/a8.jpg"];
  const start = page * size;

  return Array.from({ length: size }).map((_, i) => {
    const idx = start + i;
    const img = baseImgs[idx % baseImgs.length];
    return {
      id: String(1000 + idx),
      title: `Garsington Opera Pavilion #${idx + 1}`,
      author: `Artist ${((idx % 7) + 1).toString()}`,
      imageUrl: img,
    };
  });
}

export default function Feed() {
  const navigate = useNavigate();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // 하단 센티넬
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchNext = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    // ✅ 나중에 API 붙일 자리:
    // const res = await api.get(`/feed?page=${page}&size=${PAGE_SIZE}`)
    // setItems(prev => [...prev, ...res.items])
    // setHasMore(res.hasMore)

    // 지금은 더미로 "무한" 느낌
    await new Promise((r) => setTimeout(r, 350));
    const next = makeMockItems(page, PAGE_SIZE);

    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);

    // 데모에서는 일단 계속 로드되게 (원하면 page 제한 걸어도 됨)
    setHasMore(true);

    setLoading(false);
  };

  // 첫 로드
  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver로 무한 스크롤
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) fetchNext();
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 } // 미리 당겨 로드
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, hasMore, loading]);

  const onClickItem = (it: FeedItem) => {
    // ✅ 상세 페이지로: 가드 적용된 /artworks/:id 로 이동
    navigate(`/artworks/${it.id}`);
  };

  return (
    <section className="feed">
      <div className="feedHeader">
        <div className="feedLeft">
          <nav className="feedNav">
            <button type="button" className="feedNavItem">ARCHITECTURE</button>
            <button type="button" className="feedNavItem">INTERIORS</button>
            <button type="button" className="feedNavItem">DANCE</button>
            <button type="button" className="feedNavItem">CONTACT</button>
          </nav>
        </div>

        <div className="feedTitle">Arnnect Feed</div>
      </div>

      <div className="feedGrid" role="list">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className="feedCard"
            onClick={() => onClickItem(it)}
            aria-label={`${it.title} 상세 보기`}
          >
            <div className="feedImgWrap">
              <img className="feedImg" src={it.imageUrl} alt={it.title} loading="lazy" />
              <div className="feedOverlay">
                <div className="feedOverlayText">
                  <div className="feedOverlayTitle">{it.title}</div>
                  {it.author ? <div className="feedOverlayMeta">{it.author}</div> : null}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 센티넬 */}
      <div ref={sentinelRef} className="feedSentinel" />

      {loading ? <div className="feedLoading">Loading…</div> : null}
    </section>
  );
}
