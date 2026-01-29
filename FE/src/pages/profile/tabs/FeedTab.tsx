import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { FeedItem } from "../types";
import {
  listPostsByAuthor,
  subscribePostsUpdated,
  type LocalMode,
} from "../../../utils/localPosts";
import { useAuthStore } from "../../../stores/authStore";
import type { ProfileOutletContext } from "../Profile";
import "./profileTabs.css"; // ✅ CSS Import

type AuthUser = { memberUuid?: string | null };
type AuthState = { user?: AuthUser | null };

export default function FeedTab() {
  const nav = useNavigate();
  const { id } = useParams();
  const { profile } = useOutletContext<ProfileOutletContext>();
  const rawProfileId = id ?? "";
  const authUser = useAuthStore((s: AuthState) => s.user);
  const [tick, setTick] = useState(0);

  const effectiveProfileId = useMemo(() => {
    if (!rawProfileId) return "";
    if (rawProfileId === "me") return authUser?.memberUuid ?? "me";
    return rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  const mode: LocalMode = useMemo(() => {
    return profile.role === "ARTIST" ? "ARTIST" : "USER";
  }, [profile.role]);

  useEffect(() => {
    const unsub = subscribePostsUpdated(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

  const items: FeedItem[] = useMemo(() => {
    if (!effectiveProfileId) return [];
    const posts = listPostsByAuthor(effectiveProfileId, mode);
    const sorted = [...posts].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
    return sorted
      .filter((p) => typeof p.imageUrl === "string" && p.imageUrl.trim().length > 0)
      .map((p) => ({ id: p.id, imageUrl: p.imageUrl })) as FeedItem[];
  }, [effectiveProfileId, mode, tick]);

  const goDetail = (contentId: string) => {
    if (mode === "ARTIST") nav(`/artworks/${contentId}`);
    else nav(`/posts/${contentId}`);
  };

  return (
    <div className="tab-container">
      <div className="tab-grid-3">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className="feed-item-btn"
            onClick={() => goDetail(it.id)}
          >
            <img
              src={it.imageUrl}
              alt=""
              className="feed-img"
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