// FE/src/pages/reviews/ReviewDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { getReviewDetail } from "../../features/reviews/api";

export const PROFILE_PATH = (authorId: string) => `/members/${authorId}`;

type ReviewId = string | number;

export type ReviewDetailData = {
  reviewId: ReviewId;
  artworkId: number;
  artworkTitle: string;

  title: string;
  content: string;

  imageUrl?: string;
  createdAt?: string;
  tags?: string[];

  memberUuid: string;
  nickname: string;

  artistUuid: string;
  artistName: string;
};

function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

function getOriginFromApiBase(): string {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (!apiBase) return "";
  try {
    return new URL(apiBase).origin;
  } catch {
    return "";
  }
}

function resolveReviewImageUrl(input?: string | null): string {
  const v = String(input ?? "").trim();
  if (!v || v === "null" || v === "undefined") return "";

  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:")) return v;

  const origin = getOriginFromApiBase();

  if (v.startsWith("/review/")) return origin ? `${origin}${v}` : v;
  if (v.startsWith("review/")) return origin ? `${origin}/${v}` : `/${v}`;

  if (v.includes("/")) {
    const path = v.startsWith("/") ? v : `/${v}`;
    return origin ? `${origin}${path}` : path;
  }

  const path = `/review/${v}`;
  return origin ? `${origin}${path}` : path;
}

export default function ReviewDetail() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const nav = useNavigate();

  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setImageError(false);

        if (!normalizedReviewId) throw new Error("리뷰 ID가 없습니다.");

        const data = await getReviewDetail(normalizedReviewId);

        if (cancelled) return;
        setReview(data as ReviewDetailData);
      } catch (e) {
        console.error(e);
        if (!cancelled) setReview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedReviewId]);

  useEffect(() => {
    if (!loading && !review) {
      const t = setTimeout(() => nav("/", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, review, nav]);

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Loading...</h2>
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>리뷰를 찾을 수 없습니다.</h2>
        <button style={{ marginTop: 16 }} onClick={() => nav("/")} type="button">
          홈으로
        </button>
      </div>
    );
  }

  const imgSrc = resolveReviewImageUrl(review.imageUrl);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "110px 24px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>{review.title ?? "Untitled"}</h2>
          <div style={{ marginTop: 6, opacity: 0.72 }}>
            {review.nickname ?? "—"} · {review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}
          </div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            {review.artworkTitle} · {review.artistName ?? "Unknown Artist"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setIsLiked((prev) => {
                setLikeCount((cnt) => (prev ? cnt - 1 : cnt + 1));
                return !prev;
              });
            }}
          >
            {isLiked ? "♥" : "♡"} {likeCount}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        {!imgSrc ? (
          <div style={{ width: "100%", height: 240, background: "#f5f5f5", display: "grid", placeItems: "center" }}>
            이미지가 없습니다.
          </div>
        ) : imageError ? (
          <div style={{ width: "100%", height: 240, background: "#eee", display: "grid", placeItems: "center" }}>
            이미지 로드 실패
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={review.title ?? "review"}
            style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12 }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div style={{ marginTop: 18, lineHeight: 1.7 }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{review.content ?? ""}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(review.tags ?? []).map((t) => (
            <span key={t} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
