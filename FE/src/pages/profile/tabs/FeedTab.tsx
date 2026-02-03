// FE/src/pages/profile/tabs/FeedTab.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import { profileApi } from "../../../features/profile/api";
import { useAuthStore } from "../../../features/auth/store";
import type { ProfileOutletContext } from "../Profile";
import type { FeedItem } from "../../../features/profile/types";
import "./profileTabs.css";

export default function FeedTab() {
  const nav = useNavigate();

  const params = useParams() as Record<string, string | undefined>;
  const rawParam = params.memberUuid ?? params.id ?? params.memberId ?? ""; // ✅ 여기 핵심

  const { profile } = useOutletContext<ProfileOutletContext>();
  const authUser = useAuthStore((s) => s.user);

  const effectiveProfileId = useMemo(() => {
    if (rawParam === "me") return authUser?.memberUuid ?? "";
    return rawParam;
  }, [rawParam, authUser?.memberUuid]);

  const isArtist = String((profile as any)?.role ?? "").toUpperCase() === "ARTIST"; // ✅ role 케이스 방어

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (!effectiveProfileId) {
          if (!cancelled) setItems([]);
          return;
        }

        const page = isArtist
          ? await profileApi.getArtistFeed(effectiveProfileId)
          : await profileApi.getUserFeed(effectiveProfileId);

        // page 형태 방어(혹시 배열로 오는 경우)
        const nextItems = Array.isArray(page) ? (page as any) : (page as any)?.items ?? [];
        if (!cancelled) setItems(nextItems);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "피드 로딩 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveProfileId, isArtist]);

  const goDetail = (contentId: string) => {
    if (isArtist) nav(`/artworks/${contentId}`);
    else nav(`/posts/${contentId}`);
  };

  if (loading) {
    return (
      <div className="tab-container">
        <div className="tab-empty">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-container">
        <div className="tab-empty">{error}</div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      <div className="tab-grid-3">
        {items.map((it) => (
          <button
            key={String(it.id)}
            type="button"
            className="feed-item-btn"
            onClick={() => goDetail(String(it.id))}
          >
            <img
              src={it.imageUrl}
              alt=""
              className="feed-img"
              loading="lazy"
              onError={(e) => {
                // 이미지가 깨졌을 때 "안 보임" 처리해버리면
                // 사용자는 "피드가 비었다"고 느낄 수 있음.
                // 일단 투명처리 대신 placeholder 추천.
                e.currentTarget.style.opacity = "0.2";
              }}
            />
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="tab-empty">
          <div className="tab-empty-title">No Posts Yet</div>
          <div>아직 업로드한 게시물이 없습니다.</div>
        </div>
      )}
    </div>
  );
}
