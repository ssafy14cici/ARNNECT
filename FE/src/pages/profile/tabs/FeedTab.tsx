import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import { profileApi } from "../../../features/profile/api";
import { useAuthStore } from "../../../features/auth/store";
import type { ProfileOutletContext } from "../Profile";
import type { FeedItem } from "../../../features/profile/types";
import "./profileTabs.css";

export default function FeedTab() {
  const nav = useNavigate();
  const { memberUuid } = useParams();
  const { profile } = useOutletContext<ProfileOutletContext>();

  const authUser = useAuthStore((s) => s.user);

  const effectiveProfileId = useMemo(() => {
    const raw = memberUuid ?? "";
    if (raw === "me") return authUser?.memberUuid ?? "";
    return raw;
  }, [memberUuid, authUser?.memberUuid]);

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
          setItems([]);
          return;
        }

        const page =
          profile.role === "ARTIST"
            ? await profileApi.getArtistFeed(effectiveProfileId)
            : await profileApi.getUserFeed(effectiveProfileId);

        if (!cancelled) setItems(page.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "피드 로딩 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveProfileId, profile.role]);

  const goDetail = (contentId: string) => {
    if (profile.role === "ARTIST") nav(`/artworks/${contentId}`);
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
          <button key={it.id} type="button" className="feed-item-btn" onClick={() => goDetail(it.id)}>
            <img
              src={it.imageUrl}
              alt=""
              className="feed-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
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
