// FE/src/pages/profile/tabs/FeedTab.tsx
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

// ✅ authStore 최소 타입(필요한 것만)
type AuthUser = { memberUuid?: string | null };
type AuthState = { user?: AuthUser | null };

export default function FeedTab() {
  const nav = useNavigate();
  const { id } = useParams();

  // ✅ Profile에서 내려주는 context (profile.role 기준으로 모드 결정)
  const { profile } = useOutletContext<ProfileOutletContext>();

  const rawProfileId = id ?? "";

  // ❌ any 제거
  const authUser = useAuthStore((s: AuthState) => s.user);

  // ✅ 외부 저장소 변경을 감지하기 위한 tick (setState는 "구독 콜백"에서만 발생)
  const [tick, setTick] = useState(0);

  // ✅ /profile/me/feed → 실제 내 id로 치환
  const effectiveProfileId = useMemo(() => {
    if (!rawProfileId) return "";
    if (rawProfileId === "me") return authUser?.memberUuid ?? "me";
    return rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  // ✅ 보고 있는 프로필이 ARTIST냐 USER냐로 모드 결정
  const mode: LocalMode = useMemo(() => {
    return profile.role === "ARTIST" ? "ARTIST" : "USER";
  }, [profile.role]);

  // ✅ 저장소 업데이트 구독: setState는 콜백에서만 → lint 통과
  useEffect(() => {
    const unsub = subscribePostsUpdated(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);

  // ✅ items는 state로 저장하지 않고 계산(useMemo)으로 만들기
  const items: FeedItem[] = useMemo(() => {
    if (!effectiveProfileId) return [];

    const posts = listPostsByAuthor(effectiveProfileId, mode);

    // 최신순 정렬
    const sorted = [...posts].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );

    // src 빈값 방지 + 최소 필드만 매핑
    return sorted
      .filter((p) => typeof p.imageUrl === "string" && p.imageUrl.trim().length > 0)
      .map((p) => ({ id: p.id, imageUrl: p.imageUrl })) as FeedItem[];
  }, [effectiveProfileId, mode, tick]);

  const goDetail = (contentId: string) => {
    if (mode === "ARTIST") nav(`/artworks/${contentId}`);
    else nav(`/posts/${contentId}`);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            style={{ padding: 0, border: "none", background: "transparent" }}
            onClick={() => goDetail(it.id)}
          >
            <img
              src={it.imageUrl}
              alt=""
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                borderRadius: 8,
                display: "block",
              }}
              onError={(e) => {
                // 깨진 이미지면 숨김(레이아웃 유지)
                e.currentTarget.style.visibility = "hidden";
              }}
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
