// FE/src/pages/reviews/ReviewDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./reviewdetail.css";

import { getReviewDetail } from "../../features/reviews/api";
import { useAuthStore } from "../../features/auth/store";

import { resolveMediaUrl, fetchImageAsObjectUrl, safeToInt } from "../artworks/detail/utils";
import { PROFILE_PATH, type ReviewDetailData } from "./detail/types";
import CommentThread from "./detail/CommentThread";
import { toggleFollow } from "./detail/api";

function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

function toSafeNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

// ✅ public/basic_review.png (Vite: public은 루트로 서빙됨)
const FALLBACK_IMG = "/basic_review.png";

export default function ReviewDetail() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const nav = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const meUuid = useMemo(() => String(user?.memberUuid ?? "").trim(), [user?.memberUuid]);

  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const numericReviewId = useMemo(() => {
    const n = safeToInt(normalizedReviewId);
    return n == null ? undefined : n;
  }, [normalizedReviewId]);

  const myDisplayName = useMemo(() => {
    const n = String(user?.name ?? "").trim();
    return n || "나";
  }, [user?.name]);

  const [review, setReview] = useState<ReviewDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // 이미지
  const [imageError, setImageError] = useState(false);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageFallbackTried, setImageFallbackTried] = useState(false);

  // 팔로우
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwner = useMemo(() => {
    const me = String(user?.memberUuid ?? "").trim();
    const owner = String(review?.memberUuid ?? "").trim();
    return !!me && !!owner && me === owner;
  }, [user?.memberUuid, review?.memberUuid]);

  // ✅ 좋아요 카운트(필드명 흔들림 대비)
  const likeCount = useMemo(() => {
    const r: any = review as any;
    if (!r) return 0;

    const raw =
      r.likeCount ??
      r.likesCount ??
      r.favoriteCount ??
      r.favoritesCount ??
      r.count ??
      r.like_count ??
      r.likes_count ??
      0;

    return toSafeNumber(raw, 0);
  }, [review]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setReview(null);

        setImageError(false);
        setImageObjectUrl(null);
        setImageFallbackTried(false);

        if (!normalizedReviewId) throw new Error("리뷰 ID가 없습니다.");

        const data = (await getReviewDetail(normalizedReviewId)) as ReviewDetailData;

        if (cancelled) return;
        setReview(data);
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
    return () => {
      if (imageObjectUrl && imageObjectUrl.startsWith("blob:")) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  useEffect(() => {
    if (!loading && !review) {
      const t = setTimeout(() => nav("/", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, review, nav]);

  const onClickProfile = () => {
    if (!review?.memberUuid) return;
    nav(PROFILE_PATH(review.memberUuid));
  };

  const onGoArtwork = () => {
    if (!review?.artworkId) return;
    nav(`/artworks/${review.artworkId}`);
  };

  const onGoEdit = () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 리뷰만 수정할 수 있습니다.");
    nav(`/reviews/${normalizedReviewId}/edit`);
  };

  const onDelete = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!isOwner) return alert("본인 리뷰만 삭제할 수 있습니다.");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    alert("삭제 API 연결 필요(현재 UI만 준비됨)");
  };

  const onToggleFollow = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (isOwner) return;

    const target = String(review?.artistUuid || review?.memberUuid || "").trim();
    if (!target) return;

    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const res = await toggleFollow(target);
      if (typeof (res as any)?.isFollowing === "boolean") setIsFollowing((res as any).isFollowing);
    } catch (e) {
      console.error(e);
      setIsFollowing(prev);
      alert("팔로우 처리 실패");
    }
  };

  /**
   * ✅ 표시할 src 결정
   * 우선순위:
   * 1) blob(objectURL)
   * 2) review.imageUrl 정규화
   * 3) 없으면 fallback
   */
  const resolvedImgSrc = useMemo(() => {
    if (imageObjectUrl) return imageObjectUrl;

    const normalized = resolveMediaUrl(review?.imageUrl);
    return normalized || FALLBACK_IMG;
  }, [imageObjectUrl, review?.imageUrl]);

  const onImgError = async () => {
    // 이미 fallback 상태면 더 할 게 없음
    if (resolvedImgSrc === FALLBACK_IMG) {
      setImageError(false); // fallback은 정상 취급
      return;
    }

    if (imageFallbackTried) {
      // blob도 실패 → fallback로 끝
      setImageError(false);
      setImageObjectUrl(null);
      return;
    }

    setImageFallbackTried(true);

    const raw = String(review?.imageUrl ?? "").trim();
    if (!raw) {
      // 원본이 없음 → fallback
      setImageError(false);
      setImageObjectUrl(null);
      return;
    }

    try {
      const objUrl = await fetchImageAsObjectUrl(raw);
      if (objUrl) {
        setImageObjectUrl(objUrl);
        setImageError(false);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    // blob 실패 → fallback
    setImageError(false);
    setImageObjectUrl(null);
  };

  if (loading) {
    return (
      <div className="review-detail-page">
        <div className="review-detail-container">
          <h2 className="review-detail-loading">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="review-detail-page">
        <div className="review-detail-container">
          <h2 className="review-detail-loading">리뷰를 찾을 수 없습니다.</h2>
          <button className="rd-btn" onClick={() => nav("/")} type="button">
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (v?: string) => {
    if (!v) return "";
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  };

  return (
    <div className="review-detail-page">
      <div className="review-detail-container">
        <header className="rd-header">
          <div className="rd-title-block">
            <h2 className="rd-title">{review.title ?? "Untitled"}</h2>

            <div className="rd-meta">
              <button type="button" className="rd-link" onClick={onClickProfile}>
                {review.nickname ?? "—"}
              </button>
              <span className="rd-dot">·</span>
              <span>{formatDate(review.createdAt)}</span>
            </div>

            <div className="rd-submeta">
              <button type="button" className="rd-link" onClick={onGoArtwork}>
                {review.artworkTitle}
              </button>
              <span className="rd-dot">·</span>
              <span>{review.artistName ?? "Unknown Artist"}</span>
            </div>
          </div>

          <div className="rd-actions">
            {!isOwner && (
              <button type="button" className="rd-btn" onClick={onToggleFollow}>
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}

            {isOwner && (
              <>
                <button type="button" className="rd-btn" onClick={onGoEdit}>
                  수정
                </button>
                <button type="button" className="rd-btn danger" onClick={onDelete}>
                  삭제
                </button>
              </>
            )}
          </div>
        </header>

        <section className="rd-image">
          <img
            src={resolvedImgSrc}
            alt={review.title ?? "review"}
            className="rd-image-img"
            onError={() => {
              void onImgError();
            }}
          />
        </section>

        <section className="rd-body">
          <p className="rd-content" style={{ whiteSpace: "pre-wrap" }}>
            {review.content ?? ""}
          </p>

          <div className="rd-tags">
            {(review.tags ?? []).map((t) => (
              <span key={t} className="rd-tag">
                #{t}
              </span>
            ))}
          </div>
        </section>

        <CommentThread reviewId={numericReviewId} isLoggedIn={isLoggedIn} meUuid={meUuid} myDisplayName={myDisplayName} />
      </div>
    </div>
  );
}
