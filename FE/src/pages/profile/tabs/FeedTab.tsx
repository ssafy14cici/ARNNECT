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

/** ✅ 절대/상대 경로 모두 안전하게 */
function resolveMediaUrl(input?: string | null): string {
  const u = String(input ?? "").trim();
  if (!u || u === "null" || u === "undefined") return "";

  // 이미 완성된 URL이면 그대로
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;

  // API_BASE에서 origin만 따서 붙임 (ex. https://i14e107.p.ssafy.io:8001)
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }

  const path = u.startsWith("/") ? u : `/${u}`;
  return origin ? `${origin}${path}` : path;
}

/** 프로필 피드 탭이 최소로 쓰는 형태로 매핑(id, imageUrl) */
function toProfileFeedItem(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;

  const id =
    asString(get(v, "id"), "") ||
    asString(get(v, "artworkId"), "") ||
    asString(get(v, "reviewId"), "");
  if (!id) return null;

  const imageUrlRaw =
    asString(get(v, "imageUrl"), "") ||
    asString(get(v, "thumbnailUrl"), "") ||
    asString(get(v, "src"), "") ||
    asString(get(v, "fileUrl"), "");

  const imageUrl = resolveMediaUrl(imageUrlRaw);

  return {
    ...(v as any),
    id,
    imageUrl, // ✅ 정규화된 URL로 저장
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
    else nav(`/reviews/${contentId}`);
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
        {items.map((it) => {
          const src = resolveMediaUrl((it as any).imageUrl);

          return (
            <button
              key={String(it.id)}
              type="button"
              className="feed-item-btn"
              onClick={() => goDetail(String(it.id))}
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  className="feed-img"
                  loading="eager"   // ✅ lazy 제거/대체
                  decoding="async"
                  onError={(e) => {
                    // “아무것도 없는 것처럼” 안 보이게 확실한 fallback
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="feed-img-fallback" />
              )}
            </button>
          );
        })}
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
