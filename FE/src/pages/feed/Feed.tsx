// FE/src/pages/feed/Feed.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FeedCard } from "../../features/feed/ui/FeedCard";
import type { FeedFilterKey, FeedItem, ViewMode } from "../../features/feed/model/types";
import { getFeedList } from "../../features/feed/api";
import "./feed.css";

const DETAIL_PATH = (it: FeedItem) => {
  if (it.id.startsWith("review-")) return `/reviews/${it.id.replace("review-", "")}`;
  if (it.id.startsWith("artwork-")) return `/artworks/${it.id.replace("artwork-", "")}`;
  return it.authorRole === "USER" ? `/reviews/${it.id}` : `/artworks/${it.id}`;
};

const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

const FILTERS: Array<{ key: FeedFilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ARTIST", label: "Artist" },
  { key: "USER", label: "User" },
];

const PAGE_SIZE = 12;

export default function Feed() {
  const navigate = useNavigate();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FeedFilterKey>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filtered =
    filter === "ALL"
      ? items
      : filter === "ARTIST"
        ? items.filter((x) => x.authorRole === "ARTIST")
        : items.filter((x) => x.authorRole === "USER");

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const refetch = async () => {
    const data = await getFeedList();
    setItems(data);
  };

  useEffect(() => {
    refetch();
    // ✅ mock subscribe 제거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) setVisibleCount((v) => v + PAGE_SIZE);
      },
      { threshold: 0.1 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  const applyFilter = (next: FeedFilterKey) => {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="feedPage">
      <header className="feedHeader">
        <div className="feedControls">
          <div className="togglePill">
            <button type="button" className={`pillBtn ${viewMode === "LIST" ? "active" : ""}`} onClick={() => setViewMode("LIST")}>
              List
            </button>
            <button type="button" className={`pillBtn ${viewMode === "GRID" ? "active" : ""}`} onClick={() => setViewMode("GRID")}>
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
        {visible.map((it) => (
          <FeedCard
            key={it.id}
            feed={it}
            viewMode={viewMode}
            onClick={() => navigate(DETAIL_PATH(it))}
            onAuthorClick={(e) => {
              e?.stopPropagation?.();
              navigate(PROFILE_PATH(it.authorId));
            }}
          />
        ))}

        {visible.length === 0 && <div style={{ padding: 24, opacity: 0.8 }}>loading...</div>}
      </section>

      <div ref={sentinelRef} />
    </div>
  );
}
