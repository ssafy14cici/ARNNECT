// FE/src/pages/profile/tabs/FeedTab.tsx
import { useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { profileApi } from "../api";
import type { FeedItem, ProfileRole } from "../types";

type OutletCtx = { role: ProfileRole };

export default function FeedTab() {
  const { id } = useParams();
  const profileId = id ?? "";
  const { role } = useOutletContext<OutletCtx>();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = async () => {
    if (!profileId) return;
    if (loading || !hasNext) return;

    setLoading(true);
    try {
      const res =
        role === "ARTIST"
          ? await profileApi.getArtistFeed(profileId, cursor)
          : await profileApi.getUserFeed(profileId, cursor);

      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        for (const item of res.items) {
          if (!seen.has(item.id)) next.push(item);
        }
        return next;
      });
      setCursor(res.nextCursor ?? null);
      setHasNext(Boolean(res.nextCursor));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasNext(true);
  }, [profileId, role]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, role]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNext, loading, cursor, profileId, role]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {items.map((it) => (
          <button
            key={it.id}
            style={{ padding: 0, border: "none", background: "transparent" }}
            onClick={() => alert(`TODO: 상세 이동: ${it.id}`)}
          >
            <img
              src={it.imageUrl}
              alt=""
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 8 }}
            />
          </button>
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && <div style={{ padding: 12 }}>로딩중...</div>}
      {!hasNext && <div style={{ padding: 12, color: "#666" }}>마지막입니다.</div>}
    </div>
  );
}
