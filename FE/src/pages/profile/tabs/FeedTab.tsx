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

type PostLike = {
  id: string | number;
  imageUrl?: string | null;
  createdAt?: string | null;
};

function toPostLikes(value: unknown): PostLike[] {
  if (!Array.isArray(value)) return [];
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
  const { memberUuid } = useParams(); // ✅ routes.tsx: ":memberUuid"
  const { profile } = useOutletContext<ProfileOutletContext>();

  const authUser = useAuthStore((s) => s.user);
  const rawProfileId = memberUuid ?? "";



  // ✅ mode 변수명 및 타입을 role로 통일 (local.ts와 맞춤)
  const role: LocalRole = useMemo(
    () => (profile.role === "ARTIST" ? "ARTIST" : "USER"),
    [profile.role],
  );

  const [items, setItems] = useState<GridItem[]>([]);
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

    loadRef.current();
  }, [effectiveProfileId, mode]);

  useEffect(() => {
    const unsub = subscribePostsUpdated(() => loadRef.current());
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const goDetail = (contentId: string) => {
    // ✅ Role에 따라 상세 페이지 분기
    if (role === "ARTIST") nav(`/artworks/${contentId}`);
    else nav(`/posts/${contentId}`);
  };

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