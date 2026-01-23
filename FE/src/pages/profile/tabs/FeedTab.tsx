// FE/src/pages/profile/tabs/FeedTab.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { FeedItem, ProfileRole } from "../types";

import {
  listPostsByAuthor,
  subscribePostsUpdated,
  type LocalMode,
} from "../../../utils/localPosts";
import { useAuthStore } from "../../../stores/authStore";

type OutletCtx = { role: ProfileRole | string };

export default function FeedTab() {
  const nav = useNavigate();
  const { id } = useParams();
  const rawProfileId = id ?? "";
  const { role } = useOutletContext<OutletCtx>();

  const authUser = useAuthStore((s: any) => s.user);

  // ✅ /profile/me/feed → 실제 내 id로 치환해서 "내가 올린 것만" 보이게
  const effectiveProfileId = useMemo(() => {
    if (!rawProfileId) return "";
    if (rawProfileId === "me") return authUser?.memberUuid ?? "me";
    return rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  // ✅ 프로필 역할에 따라 ARTIST면 artworks 성격(작품), USER면 posts 성격(감상평)
  const mode: LocalMode = useMemo(() => {
    const r = String(role);
    const isArtistProfile = r === "ARTIST" || r === "artist";
    return isArtistProfile ? "ARTIST" : "USER";
  }, [role]);

  const [items, setItems] = useState<FeedItem[]>([]);

  const reload = () => {
    if (!effectiveProfileId) {
      setItems([]);
      return;
    }

    // ✅ 로컬 저장소에서 "해당 프로필 + 해당 모드"만 가져오기
    const posts = listPostsByAuthor(effectiveProfileId, mode);

    // 최신순 정렬 + src 빈값 방지
    posts.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    setItems(
      posts
        .filter((p) => Boolean(p.imageUrl)) // src="" 방지
        .map((p) => ({ id: p.id, imageUrl: p.imageUrl })) as FeedItem[]
    );
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProfileId, mode]);

  // ✅ 글 작성 후(로컬 저장 이벤트) 자동 반영
  useEffect(() => {
    const unsub = subscribePostsUpdated(() => reload());
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProfileId, mode]);

  const goDetail = (contentId: string) => {
    // ARTIST 업로드(작품) → 작품 디테일
    if (mode === "ARTIST") nav(`/artworks/${contentId}`);
    // USER 업로드(포스트) → 포스트 디테일
    else nav(`/posts/${contentId}`);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {items.map((it) => (
          <button
            key={it.id}
            style={{ padding: 0, border: "none", background: "transparent" }}
            onClick={() => goDetail(it.id)}
          >
            <img
              src={it.imageUrl}
              alt=""
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 8 }}
            />
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ padding: 16, color: "#666" }}>아직 업로드한 게시물이 없습니다.</div>
      )}
    </div>
  );
}
