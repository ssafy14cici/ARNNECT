// FE/src/pages/profile/tabs/FeedTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import { listPostsByAuthor, subscribePostsUpdated } from "../../../features/feed/posts/api";
import { useAuthStore } from "../../../features/auth/store";
import type { ProfileOutletContext } from "../Profile";
import "./profileTabs.css";

type LocalMode = "ARTIST" | "USER";

type GridItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

// listPostsByAuthor가 반환하는 “최소 형태”만 안전하게 정의
type PostLike = {
  id: string | number;
  imageUrl?: string | null;
  createdAt?: string | null;
};

function toPostLikes(value: unknown): PostLike[] {
  if (!Array.isArray(value)) return [];
  // unknown[] -> PostLike[] 로 “안전”하게 변환
  return value
    .map((v) => (typeof v === "object" && v !== null ? (v as Partial<PostLike>) : null))
    .filter((v): v is Partial<PostLike> => Boolean(v))
    .map((v) => ({
      id: v.id ?? "",
      imageUrl: v.imageUrl ?? null,
      createdAt: v.createdAt ?? null,
    }))
    .filter((v) => v.id !== "");
}

export default function FeedTab() {
  const nav = useNavigate();
  const { id } = useParams();
  const { profile } = useOutletContext<ProfileOutletContext>();

  const authUser = useAuthStore((s) => s.user);
  const rawProfileId = id ?? "";

  const effectiveProfileId = useMemo(() => {
    if (!rawProfileId) return "";
    if (rawProfileId === "me") return authUser?.memberUuid ?? "";
    return rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  const mode: LocalMode = useMemo(
    () => (profile.role === "ARTIST" ? "ARTIST" : "USER"),
    [profile.role],
  );

  const [items, setItems] = useState<GridItem[]>([]);

  // 최신 로드 함수를 ref에 넣어두고, subscribe 콜백에서 호출
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    loadRef.current = () => {
      if (!effectiveProfileId) {
        setItems([]);
        return;
      }

      const raw = listPostsByAuthor(effectiveProfileId, mode) as unknown;
      const posts = toPostLikes(raw);

      const next: GridItem[] = posts
        .filter((p) => typeof p.imageUrl === "string" && p.imageUrl.trim().length > 0)
        .map((p) => ({
          id: String(p.id),
          imageUrl: p.imageUrl!.trim(),
          createdAt: typeof p.createdAt === "string" ? p.createdAt : "",
        }))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      setItems(next);
    };

    // 프로필/모드 바뀌면 즉시 1회 로드
    loadRef.current();
  }, [effectiveProfileId, mode]);

  useEffect(() => {
    const unsub = subscribePostsUpdated(() => {
      loadRef.current();
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

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
