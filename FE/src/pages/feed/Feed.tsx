import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FeedCard, ViewMode } from "../../components/feed/FeedCard"; 
import "./feed.css";

// --- Types & Constants ---
const DETAIL_PATH = (id: string) => `/artworks/${id}`;
const PROFILE_PATH = (authorId: string) => `/profile/${authorId}`;

export type FeedRole = "ARTIST" | "USER";

interface FeedItem {
  id: string;
  role: FeedRole;
  title: string;
  excerpt?: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  imageUrl?: string;
  category?: string;
  likes?: number;
  views?: number;
}

type FeedFilterKey = "ALL" | "ARTIST" | "USER";

const FILTERS: Array<{ key: FeedFilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ARTIST", label: "Artist" },
  { key: "USER", label: "User" },
];

const PAGE_SIZE = 12;

// ✅ Public 폴더에 있는 이미지 경로 (없으면 엑박 뜨니 확인 필요)
const ART_IMAGES = Array.from({ length: 12 }).map((_, i) => `/art/a${i + 1}.jpg`);

// --- Mock Data Generator (더미 데이터 생성) ---
function buildMockFeeds(total = 48): FeedItem[] {
  const artistNames = ["A. KIM", "S. LEE", "J. PARK", "H. CHOI"];
  const userNames = ["U. PARK", "U. CHOI", "U. KANG", "U. HAN"];
  const cats = ["Lacquer", "Oil Paint", "Sculpture", "Media Art", "Sketch"];

  return Array.from({ length: total }).map((_, idx) => {
    const role: FeedRole = idx % 2 === 0 ? "ARTIST" : "USER";
    const isTextOnly = idx % 8 === 0; // 8개 중 1개는 이미지 없음
    const authorName = role === "ARTIST" ? artistNames[idx % artistNames.length] : userNames[idx % userNames.length];
    const imageUrl = isTextOnly ? undefined : ART_IMAGES[idx % ART_IMAGES.length];

    return {
      id: String(idx + 1),
      role,
      title: role === "ARTIST" ? `Untitled No.${idx + 1}` : `Exhibition Review #${idx + 1}`,
      excerpt: "Through artistic expression, master artisans bring to life stories of resilience and beauty. This piece explores the depth of...",
      authorName,
      authorId: role === "ARTIST" ? `artist-${(idx % 6) + 1}` : `user-${(idx % 10) + 1}`,
      createdAt: new Date().toISOString(),
      imageUrl,
      category: cats[idx % cats.length],
      likes: Math.floor(Math.random() * 500),
      views: Math.floor(Math.random() * 2000),
    };
  });
}

export default function Feed() {
  const navigate = useNavigate();
  
  // 1. 데이터 상태
  const [feeds] = useState<FeedItem[]>(() => buildMockFeeds(60));
  
  // 2. UI 상태 (필터, 뷰 모드, 페이지네이션)
  const [filter, setFilter] = useState<FeedFilterKey>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // 3. 무한 스크롤 Refs
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // --- Filtering Logic ---
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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 필터 변경 시 맨 위로
  };

  // --- Infinite Scroll Logic ---
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [hasMore]);

  // --- Handlers ---
  const goDetail = (id: string) => navigate(DETAIL_PATH(id));
  const goProfile = (authorId: string) => navigate(PROFILE_PATH(authorId));

  return (
    <div className="feedPage">
      {/* --- Header (Lumen Style Typography) --- */}
      <header className="feedHeader">
        <h1 className="feedMainTitle">
          <span className="italic-serif">(Art)</span> Gallery
        </h1>
        
        <p className="feedDesc">
          We invite you to immerse yourself in the essence of culture.<br/>
          Through artistic expression, master artisans bring to life stories of resilience and beauty.
        </p>

        {/* Controls: View Toggle & Filter */}
        <div className="feedControls">
          {/* 1. View Mode Toggle (Pill Shape) */}
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

          {/* 2. Filter Buttons */}
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

      {/* --- Feed Container (Spotlight Effect Wrapper) --- */}
      {/* viewMode에 따라 CSS 클래스 변경 (mode-list / mode-grid) */}
      <section className={`feedContainer ${viewMode === "LIST" ? "mode-list" : "mode-grid"}`}>
        {visibleFeeds.map((item) => (
          <FeedCard
            key={item.id}
            feed={item}          
            viewMode={viewMode}  // 리스트/그리드 모드 전달
            onClick={() => goDetail(item.id)}
            onAuthorClick={(e) => {
              // FeedCard 내부 버튼 클릭 이벤트 처리
              goProfile(item.authorId);
            }}
          />
        ))}
      </section>

      {/* --- Infinite Scroll Sentinel --- */}
      <div ref={sentinelRef} className="loadingTrigger" />
      
      {/* Loading Indicator */}
      {hasMore && (
        <div className="loadingText">
          <span>LOADING MORE</span>
        </div>
      )}
    </div>
  );
}