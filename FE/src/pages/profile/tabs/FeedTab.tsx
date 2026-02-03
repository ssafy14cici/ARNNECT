import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import { profileApi } from "../../../features/profile/api";
import { useAuthStore } from "../../../features/auth/store";
import type { ProfileOutletContext } from "../Profile";
import type { FeedItem } from "../../../features/profile/types";
import "./profileTabs.css";

/** 안전 파서 */
type JsonObject = Record<string, unknown>;
function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}
function get(obj: JsonObject, key: string) {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

/** 프로필 피드 탭이 최소로 쓰는 형태로 매핑(id, imageUrl) */
function toProfileFeedItem(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;

  const id = asString(get(v, "id"), "") || asString(get(v, "artworkId"), "") || asString(get(v, "reviewId"), "");
  if (!id) return null;

  const imageUrl =
    asString(get(v, "imageUrl"), "") ||
    asString(get(v, "thumbnailUrl"), "");

  // imageUrl이 비어있어도 "글은 존재"할 수 있으니
  // 필요하면 아래 조건을 풀어도 됨.
  // if (!imageUrl) return null;

  return {
    ...(v as any),
    id,
    imageUrl,
  } as FeedItem;
}

function normalizeRole(raw: unknown) {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "ARTIST") return "ARTIST";
  if (s === "USER") return "USER";
  if (s === "GENERAL") return "USER";
  const lower = String(raw ?? "").trim().toLowerCase();
  if (lower === "artist") return "ARTIST";
  if (lower === "general") return "USER";
  return "USER";
}

export default function FeedTab() {
  const nav = useNavigate();

  // param 이름 방어(memberUuid / id)
  const params = useParams() as Record<string, string | undefined>;
  const memberUuid = params.memberUuid ?? params.id ?? "";

  const { profile } = useOutletContext<ProfileOutletContext>();
  const authUser = useAuthStore((s) => s.user);

  const effectiveProfileId = useMemo(() => {
    const raw = memberUuid ?? "";
    if (raw === "me") return authUser?.memberUuid ?? "";
    return raw;
  }, [memberUuid, authUser?.memberUuid]);

  const isArtist = useMemo(() => normalizeRole((profile as any)?.role) === "ARTIST", [profile]);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        if (!effectiveProfileId) {
          if (!cancelled) setItems([]);
          return;
        }

        const res = isArtist
          ? await profileApi.getArtistFeed(effectiveProfileId)
          : await profileApi.getUserFeed(effectiveProfileId);

        // ✅ res가 배열이거나 {items: []} 둘 다 대응
        const rawItems = Array.isArray(res) ? res : ((res as any)?.items ?? []);

        const mapped = (rawItems as unknown[])
          .map(toProfileFeedItem)
          .filter((x): x is FeedItem => x !== null);

        if (!cancelled) setItems(mapped);
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
              src={(it as any).imageUrl}
              alt=""
              className="feed-img"
              loading="lazy"
              onError={(e) => {
                // 기존 visibility:hidden은 “아무것도 없는 것처럼” 보이게 만들 수 있음
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
