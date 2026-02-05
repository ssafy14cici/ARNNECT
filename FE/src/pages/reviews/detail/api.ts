// FE/src/pages/reviews/detail/api.ts
import { http } from "../../../shared/api/http";
import { isObject } from "../../artworks/detail/utils";
import {
  mapCommentResponseList,
  mapSingleComment,
  parseFollowToggleResult,
  type LocalComment,
  type FollowToggleResult,
} from "./mappers";

const COMMENTS_PATH = "/api/v1/comments";
const FOLLOW_TOGGLE_PATH = "/api/v1/follow";

function unwrapAxiosData(res: unknown): unknown {
  return isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
}

/**
 * ✅ 리뷰 댓글 목록(확정 스펙)
 * GET /api/v1/comments?targetId={targetId}&targetType=REVIEW
 *
 * + 혹시 서버가 예전 파라미터도 유지 중이면 fallback
 */
export async function fetchReviewComments(reviewId: number): Promise<LocalComment[]> {
  const tryUrls = [
    // ✅ 1순위: 확정 스펙
    `${COMMENTS_PATH}?targetId=${encodeURIComponent(String(reviewId))}&targetType=REVIEW`,

    // fallback (필요 없으면 지워도 됨)
    `${COMMENTS_PATH}?reviewId=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?target=${encodeURIComponent("REVIEW")}&id=${encodeURIComponent(String(reviewId))}`,
    `${COMMENTS_PATH}?targetType=${encodeURIComponent("REVIEW")}&targetId=${encodeURIComponent(String(reviewId))}`,
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

/* ============================================================================
   ✅ 호환(alias) export: 기존 컴포넌트 코드(import) 안 깨지게 유지
============================================================================ */
export const createReviewComment = createReviewCommentOnServer;
export const updateComment = updateCommentOnServer;
export const deleteComment = deleteCommentOnServer;
export const toggleFollow = toggleFollowOnServer;
