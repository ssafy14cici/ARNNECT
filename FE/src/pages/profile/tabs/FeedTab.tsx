// FE/src/pages/profile/tabs/FeedTab.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
// ✅ LocalMode -> LocalRole로 변경된 타입 반영
import {
  listPostsByAuthor,
  subscribePostsUpdated,
  type LocalRole,
} from "../../../features/posts/local";

import { useAuthStore } from "../../../features/auth/store";
import type { ProfileOutletContext } from "../Profile";
import "./profileTabs.css";

type GridItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

export default function FeedTab() {
  const nav = useNavigate();
  const { id } = useParams();
  const { profile } = useOutletContext<ProfileOutletContext>();

  const authUser = useAuthStore((s) => s.user);
  const effectiveProfileId = authUser?.memberUuid ?? "";

  const rawProfileId = id ?? "";
  const [tick, setTick] = useState(0);



  // ✅ mode 변수명 및 타입을 role로 통일 (local.ts와 맞춤)
  const role: LocalRole = useMemo(
    () => (profile.role === "ARTIST" ? "ARTIST" : "USER"),
    [profile.role],
  );

  useEffect(() => {
    const unsub = subscribePostsUpdated(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

  const items: GridItem[] = useMemo(() => {
    if (!effectiveProfileId) return [];

    // ✅ listPostsByAuthor 호출 시 role 전달
    const posts = listPostsByAuthor(effectiveProfileId, role);

    return posts
      .map((p) => {
        // ✅ [핵심 수정] 이미지가 배열(imageUrls)에 있든 문자열(imageUrl)에 있든 다 찾아냄
        const img = (Array.isArray(p.imageUrls) ? p.imageUrls[0] : undefined) ?? p.imageUrl;
        
        return {
          id: p.id,
          imageUrl: img ?? "",
          createdAt: p.createdAt ?? "",
        };
      })
      // ✅ 이미지가 존재하는 것만 필터링 (빈 문자열 제외)
      .filter((p) => p.imageUrl.trim().length > 0)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [effectiveProfileId, role, tick]);

  const goDetail = (contentId: string) => {
    // ✅ Role에 따라 상세 페이지 분기
    if (role === "ARTIST") nav(`/artworks/${contentId}`);
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