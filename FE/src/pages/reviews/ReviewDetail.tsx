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
      if (imageObjectUrl && imageObjectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageObjectUrl);
      }
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

    const target = String(review?.artistUuid || review?.memberUuid || "").trim();
    if (!target) return;

    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const res = await toggleFollow(target);
      if (typeof res?.isFollowing === "boolean") setIsFollowing(res.isFollowing);
    } catch (e) {
      console.error(e);
      setIsFollowing(prev);
      alert("팔로우 처리 실패");
    }
  };

  const resolvedImgSrc = useMemo(() => {
    if (imageObjectUrl) return imageObjectUrl;
    return resolveMediaUrl(review?.imageUrl);
  }, [imageObjectUrl, review?.imageUrl]);

  const onImgError = async () => {
    if (imageFallbackTried) {
      setImageError(true);
      return;
    }

    setImageFallbackTried(true);

    const raw = String(review?.imageUrl ?? "").trim();
    if (!raw) {
      setImageError(true);
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

    setImageError(true);
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
            <button type="button" className="rd-btn" onClick={onToggleFollow}>
              {isFollowing ? "Following" : "Follow"}
            </button>

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
          {!resolvedImgSrc ? (
            <div className="rd-image-fallback">이미지가 없습니다.</div>
          ) : imageError ? (
            <div className="rd-image-fallback">이미지 로드 실패</div>
          ) : (
            <img src={resolvedImgSrc} alt={review.title ?? "review"} className="rd-image-img" onError={onImgError} />
          )}
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

        {/* ✅ 댓글은 분리 컴포넌트 */}
        <CommentThread reviewId={numericReviewId} isLoggedIn={isLoggedIn} meUuid={meUuid} myDisplayName={myDisplayName} />
      </div>
    </div>
  );
}
