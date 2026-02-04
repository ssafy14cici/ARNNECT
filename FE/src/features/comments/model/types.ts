// FE/src/features/comments/model/types.ts

export type CommentId = string;
export type CommentTargetType = "ARTWORK" | "REVIEW";

/**
 * UI에서 쓰는 표준 Comment 모델
 * - id는 string으로 통일(서버가 number/long이어도 String 변환)
 * - parentId: 대댓글이면 부모 댓글 id, 아니면 null
 *
 * ⚠️ 현재 BE CommentResponse에는 작성자 식별자가 없고 nickName만 있음.
 *    그래서 "내 댓글" 판별은 authorName(=nickName)과 내 nickname 비교로 임시 처리.
 */
export type Comment = {
  id: CommentId;

  targetType: CommentTargetType;
  targetId: number;

  content: string;
  parentId: CommentId | null;

  /** (선택) BE가 나중에 내려주면 사용 */
  authorId?: string;

  /** BE CommentResponse.nickName 매핑 */
  authorName?: string;

  createdAt?: string; // BE에서 안 주면 undefined
};

export type CreateCommentInput = {
  targetType: CommentTargetType;
  targetId: number;
  content: string;
  parentId?: CommentId | null;
};

export type UpdateCommentInput = {
  content: string;
};

export type CommentHandlers = {
  onDelete: (id: CommentId) => void | Promise<void>;
  onUpdate: (id: CommentId, content: string) => void | Promise<void>;
  onAddReply: (parentId: CommentId, content: string) => void | Promise<void>;
};

export type ProfilePathFn = (authorId: string) => string;

/* ----------------- 유틸(실API 매핑/요청용) ----------------- */

export function normalizeId(v: unknown): CommentId {
  return String(v ?? "").trim();
}

/** parentId(string|null)를 BE가 기대할 수 있는 number|null로 변환 */
export function toParentCommentId(parentId?: CommentId | null): number | null {
  if (!parentId) return null;
  const n = Number(String(parentId));
  return Number.isFinite(n) ? n : null;
}
