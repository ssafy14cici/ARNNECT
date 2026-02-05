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
 */
export async function fetchReviewComments(reviewId: number): Promise<LocalComment[]> {
  const tryUrls = [
    `${COMMENTS_PATH}?targetId=${encodeURIComponent(String(reviewId))}&targetType=REVIEW`,

    // fallback(서버 레거시가 남아있을 때만)
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

/** ✅ 댓글 생성 */
export async function createReviewComment(args: {
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

/** ✅ 댓글 수정 */
export async function updateComment(commentId: string, content: string): Promise<void> {
  await http.put(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, { content });
}

/** ✅ 댓글 삭제 */
export async function deleteComment(commentId: string): Promise<void> {
  await http.delete(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`);
}

/** ✅ 팔로우 토글 */
export async function toggleFollow(targetMemberUuid: string): Promise<FollowToggleResult> {
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
