// FE/src/pages/reviews/detail/api.ts
import { http } from "../../../shared/api/http";
import { isObject } from "../../artworks/detail/utils";
import {
  mapCommentResponseList,
  mapSingleComment,
  parseLikeToggleResult,
  parseFollowToggleResult,
  type LocalComment,
  type LikeToggleResult,
  type FollowToggleResult,
} from "./mappers";

const COMMENTS_PATH = "/api/v1/comments";
const FOLLOW_TOGGLE_PATH = "/api/v1/follow";
const REVIEW_LIKE_TOGGLE_CANDIDATES = [
  // ✅ 가장 흔한 후보들 (실제 BE에 맞는 것만 1개 성공하면 됨)
  { url: (id: number) => `/api/v1/reviews/like`, body: (id: number) => ({ reviewId: id }) },
  { url: (id: number) => `/api/v1/reviews/${id}/like`, body: (_: number) => ({}) },
  { url: (id: number) => `/api/v1/reviews/${id}/likes`, body: (_: number) => ({}) },
  { url: (id: number) => `/api/v1/reviews/likes`, body: (id: number) => ({ reviewId: id }) },
];

function unwrapAxiosData(res: unknown): unknown {
  return isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
}

function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  return (raw as any).data ?? raw;
}

/**
 * ✅ 리뷰 댓글 목록
 * - BE마다 쿼리 파라미터가 다름 → 후보를 순차 시도
 */
export async function fetchReviewComments(reviewId: number): Promise<LocalComment[]> {
  const tryUrls = [
    // 1) 가장 직관적인 형태
    `${COMMENTS_PATH}?reviewId=${encodeURIComponent(String(reviewId))}`,
    // 2) target/id 형태(네가 artwork에서 쓰던 것)
    `${COMMENTS_PATH}?target=${encodeURIComponent("REVIEW")}&id=${encodeURIComponent(String(reviewId))}`,
    // 3) targetType/targetId 형태(명세서에 있던 형태)
    `${COMMENTS_PATH}?targetType=${encodeURIComponent("REVIEW")}&targetId=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?targetType=${encodeURIComponent("REVIEW")}&targetId=${encodeURIComponent(String(reviewId))}&page=0&size=200`,
    // 4) review= 형태(예전 명세 스타일)
    `${COMMENTS_PATH}?review=${encodeURIComponent(String(reviewId))}`,
  ];

  let lastErr: unknown = null;

  for (const url of tryUrls) {
    try {
      const res = await http.get(url);
      const payload = unwrapAxiosData(res);
      return mapCommentResponseList(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}

export async function createReviewCommentOnServer(args: {
  reviewId: number;
  content: string;
  parentCommentId?: number | null;
}): Promise<LocalComment | null> {
  const res = await http.post(COMMENTS_PATH, {
    targetType: "REVIEW",
    targetId: args.reviewId,
    content: args.content,
    parentCommentId: args.parentCommentId ?? null,
  });

  const payload = unwrapAxiosData(res);
  return mapSingleComment(payload);
}

export async function updateCommentOnServer(commentId: string, content: string): Promise<void> {
  await http.put(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, { content });
}

export async function deleteCommentOnServer(commentId: string): Promise<void> {
  await http.delete(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`);
}

/**
 * ✅ 리뷰 좋아요 토글
 * - 실제 엔드포인트가 확정되면 후보 1개만 남기면 됨
 */
export async function toggleReviewLikeOnServer(reviewId: number): Promise<LikeToggleResult> {
  let lastErr: unknown = null;

  for (const c of REVIEW_LIKE_TOGGLE_CANDIDATES) {
    try {
      const res = await http.post(c.url(reviewId), c.body(reviewId));
      const payload = unwrapAxiosData(res);
      return parseLikeToggleResult(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}

/**
 * ✅ 팔로우 토글: /api/v1/follow/{memberUuid}
 */
export async function toggleFollowOnServer(targetMemberUuid: string): Promise<FollowToggleResult> {
  // 서버가 POST/PUT 중 뭘 쓰는지 모를 수 있어서 후보 처리
  const tryCalls = [
    () => http.post(`${FOLLOW_TOGGLE_PATH}/${encodeURIComponent(targetMemberUuid)}`),
    () => http.put(`${FOLLOW_TOGGLE_PATH}/${encodeURIComponent(targetMemberUuid)}`),
  ];

  let lastErr: unknown = null;

  for (const call of tryCalls) {
    try {
      const res = await call();
      const payload = unwrapAxiosData(res);
      return parseFollowToggleResult(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}
