// FE/src/pages/reviews/ReviewDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./reviewdetail.css";

import { http } from "../../shared/api/http";
import { getReviewDetail } from "../../features/reviews/api";
import { useAuthStore } from "../../features/auth/store";

import {
  resolveMediaUrl,
  fetchImageAsObjectUrl,
  getAccessTokenFromStore,
  safeToInt,
} from "../artworks/detail/utils";

import {
  mapCommentResponseList,
  mapSingleComment,
  type LocalComment,
} from "../artworks/detail/mappers";

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

  memberUuid: string; // 리뷰 작성자 uuid
  nickname: string; // 리뷰 작성자 닉네임

  artistUuid: string; // 작품 작가 uuid(서버가 주면)
  artistName: string;

  likeCount?: number; // 서버가 주면 흡수
  isLiked?: boolean; // 서버가 주면 흡수
};

function normalizeId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^review-/, "").replace(/^artwork-/, "");
}

function unwrapAxiosData(res: unknown): unknown {
  return res && typeof res === "object" && "data" in (res as any) ? (res as any).data : res;
}

function authConfig() {
  const token = getAccessTokenFromStore();
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

// ------------------- API (Comments / Follow / Like) -------------------
const COMMENTS_PATH = "/api/v1/comments";
const FOLLOW_TOGGLE_PATH = "/api/v1/follow";

async function fetchReviewComments(reviewId: number): Promise<LocalComment[]> {
  const tryUrls = [
    `${COMMENTS_PATH}?reviewId=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?review=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?target=REVIEW&id=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?targetType=REVIEW&targetId=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?targetType=REVIEW&targetId=${encodeURIComponent(String(reviewId))}&page=0&size=200`,
  ];

  let lastErr: unknown = null;

  for (const url of tryUrls) {
    try {
      const res = await http.get(url, authConfig());
      const payload = unwrapAxiosData(res);
      return mapCommentResponseList(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}

async function createReviewComment(args: {
  reviewId: number;
  content: string;
  parentCommentId?: number | null;
}): Promise<LocalComment | null> {
  const res = await http.post(
    COMMENTS_PATH,
    {
      targetType: "REVIEW",
      targetId: args.reviewId,
      content: args.content,
      parentCommentId: args.parentCommentId ?? null,
    },
    authConfig(),
  );

  const payload = unwrapAxiosData(res);
  return mapSingleComment(payload);
}

async function updateComment(commentId: string, content: string): Promise<void> {
  await http.put(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, { content }, authConfig());
}

async function deleteComment(commentId: string): Promise<void> {
  await http.delete(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, authConfig());
}

async function toggleFollow(targetMemberUuid: string): Promise<void> {
  await http.post(`${FOLLOW_TOGGLE_PATH}/${encodeURIComponent(targetMemberUuid)}`, {}, authConfig());
}

async function toggleReviewLikeOnServer(
  _reviewId: number,
): Promise<{ isLiked?: boolean; likeCount?: number } | null> {
  // TODO: 서버 라우트 확정되면 연결
  return null;
}

// ------------------- Component -------------------
export default function ReviewDetail() {
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const nav = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const normalizedReviewId = useMemo(() => normalizeId(reviewId), [reviewId]);

  const numericReviewId = useMemo(() => {
    const n = Number.parseInt(String(normalizedReviewId), 10);
    return Number.isFinite(n) ? n : undefined;
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

  // 좋아요
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 팔로우
  const [isFollowing, setIsFollowing] = useState(false);

  // 댓글
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const isOwner = useMemo(() => {
    const me = String(user?.memberUuid ?? "").trim();
    const owner = String(review?.memberUuid ?? "").trim();
    return !!me && !!owner && me === owner;
  }, [user?.memberUuid, review?.memberUuid]);

  const rootComments = useMemo(() => comments.filter((c) => c.parentId == null), [comments]);

  const repliesByParent = useMemo(() => {
    const m = new Map<string, LocalComment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const list = m.get(c.parentId) ?? [];
      list.push(c);
      m.set(c.parentId, list);
    }
    return m;
  }, [comments]);

  // 상세 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setReview(null);

        // 이미지 상태 초기화
        setImageError(false);
        setImageObjectUrl(null);
        setImageFallbackTried(false);

        if (!normalizedReviewId) throw new Error("리뷰 ID가 없습니다.");

        const data = (await getReviewDetail(normalizedReviewId)) as ReviewDetailData;

        if (cancelled) return;
        setReview(data);

        if (typeof data?.isLiked === "boolean") setIsLiked(data.isLiked);
        if (typeof data?.likeCount === "number" && Number.isFinite(data.likeCount)) setLikeCount(data.likeCount);
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

  // blob URL revoke (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (imageObjectUrl && imageObjectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [imageObjectUrl]);

  // 댓글 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!numericReviewId || !Number.isFinite(numericReviewId)) return;

      try {
        setCommentsLoading(true);
        setCommentsError(null);

        const list = await fetchReviewComments(numericReviewId);

        if (cancelled) return;
        setComments(list);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setComments([]);
        setCommentsError("댓글을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [numericReviewId]);

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

  const onToggleLike = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const prevLiked = isLiked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    setIsLiked(nextLiked);
    setLikeCount((cnt) => (nextLiked ? cnt + 1 : Math.max(0, cnt - 1)));

    try {
      if (!numericReviewId) return;

      const res = await toggleReviewLikeOnServer(numericReviewId);
      if (res) {
        if (typeof res.isLiked === "boolean") setIsLiked(res.isLiked);
        if (typeof res.likeCount === "number" && Number.isFinite(res.likeCount)) setLikeCount(res.likeCount);
      }
    } catch (e) {
      console.error(e);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      alert("좋아요 처리 실패");
    }
  };

  const onToggleFollow = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const target = String(review?.artistUuid || review?.memberUuid || "").trim();
    if (!target) return;

    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      await toggleFollow(target);
    } catch (e) {
      console.error(e);
      setIsFollowing(prev);
      alert("팔로우 처리 실패");
    }
  };

  const refetchComments = async () => {
    if (!numericReviewId || !Number.isFinite(numericReviewId)) return;

    setCommentsLoading(true);
    try {
      const list = await fetchReviewComments(numericReviewId);
      setComments(list);
    } catch (e) {
      console.error(e);
      setComments([]);
      setCommentsError("댓글을 불러오지 못했습니다.");
    } finally {
      setCommentsLoading(false);
    }
  };

  const onSubmitComment = async () => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!numericReviewId || !Number.isFinite(numericReviewId)) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    setComments((prev) => [
      ...prev,
      { id: tempId, parentId: null, content: trimmed, authorName: myDisplayName },
    ]);
    setCommentText("");

    try {
      const created = await createReviewComment({
        reviewId: numericReviewId,
        content: trimmed,
        parentCommentId: null,
      });
      if (created) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert("댓글 작성 실패");
    }
  };

  const onEditComment = async (id: string, current: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");

    const next = prompt("수정 내용", current);
    if (next == null) return;

    const value = next.trim();
    if (!value) return;

    const prev = comments;
    setComments((cur) => cur.map((c) => (c.id === id ? { ...c, content: value } : c)));

    try {
      await updateComment(id, value);
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 수정 실패");
    }
  };

  const onDeleteComment = async (id: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!window.confirm("삭제하시겠습니까?")) return;

    const prev = comments;
    setComments((cur) => cur.filter((c) => c.id !== id && c.parentId !== id));

    try {
      await deleteComment(id);
    } catch (e) {
      console.error(e);
      setComments(prev);
      alert("댓글 삭제 실패");
    }
  };

  const onReplyComment = async (parentId: string) => {
    if (!isLoggedIn) return alert("로그인이 필요합니다.");
    if (!numericReviewId || !Number.isFinite(numericReviewId)) return;

    const reply = prompt("답글 내용");
    if (reply == null) return;

    const trimmed = reply.trim();
    if (!trimmed) return;

    const parentNum = safeToInt(parentId);
    if (parentNum == null) return alert("부모 댓글 ID 파싱 실패");

    const tempId = `temp-${crypto.randomUUID()}`;
    setComments((prev) => [
      ...prev,
      { id: tempId, parentId, content: trimmed, authorName: myDisplayName },
    ]);

    try {
      const created = await createReviewComment({
        reviewId: numericReviewId,
        content: trimmed,
        parentCommentId: parentNum,
      });

      if (created) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      } else {
        await refetchComments();
      }
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert("답글 작성 실패");
    }
  };

  // ✅ 이미지 src: 1) blob 성공하면 blob 우선 2) 아니면 resolveMediaUrl
  const resolvedImgSrc = useMemo(() => {
    if (imageObjectUrl) return imageObjectUrl;
    return resolveMediaUrl(review?.imageUrl);
  }, [imageObjectUrl, review?.imageUrl]);

  // ✅ <img> 로드 실패 시: Authorization 필요할 수 있으니 blob fallback 시도
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
              <span>{review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}</span>
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
            <button type="button" className="rd-btn" onClick={onToggleLike}>
              {isLiked ? "♥" : "♡"} {likeCount}
            </button>

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
            <img
              src={resolvedImgSrc}
              alt={review.title ?? "review"}
              className="rd-image-img"
              onError={onImgError}
            />
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

        {/* Comments */}
        <section className="rd-comments">
          <div className="rd-comments-head">
            <h3 className="rd-comments-title">Comments ({comments.length})</h3>
          </div>

          {commentsLoading && <div className="rd-comments-hint">Loading comments...</div>}
          {commentsError && <div className="rd-comments-hint">{commentsError}</div>}

          <div className="rd-comment-input">
            <input
              className="rd-comment-input-field"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
            />
            <button type="button" className="rd-btn" onClick={onSubmitComment}>
              등록
            </button>
          </div>

          <div className="rd-comment-list">
            {rootComments.map((c) => (
              <div key={c.id} className="rd-comment-item">
                <div className="rd-comment-meta">
                  <strong>{c.authorName ?? "User"}</strong>
                  <span className="rd-dot">·</span>
                  <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}</span>
                </div>

                <div className="rd-comment-text">{c.content}</div>

                <div className="rd-comment-actions">
                  <button type="button" className="rd-link" onClick={() => onEditComment(c.id, c.content)}>
                    수정
                  </button>
                  <span className="rd-dot">·</span>
                  <button type="button" className="rd-link" onClick={() => onDeleteComment(c.id)}>
                    삭제
                  </button>
                  <span className="rd-dot">·</span>
                  <button type="button" className="rd-link" onClick={() => onReplyComment(c.id)}>
                    답글
                  </button>
                </div>

                {(repliesByParent.get(c.id) ?? []).length > 0 && (
                  <div className="rd-replies">
                    {(repliesByParent.get(c.id) ?? []).map((r) => (
                      <div key={r.id} className="rd-reply-item">
                        <div className="rd-comment-meta">
                          <strong>{r.authorName ?? "User"}</strong>
                          <span className="rd-dot">·</span>
                          <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                        <div className="rd-comment-text">{r.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
