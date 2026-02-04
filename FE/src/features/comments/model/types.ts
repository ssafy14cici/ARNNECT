// FE/src/features/comments/model/types.ts

export type CommentId = string;
export type CommentTargetType = "ARTWORK" | "REVIEW";

/**
 * UI에서 쓰는 표준 Comment 모델
 * - id는 string으로 통일(서버가 number여도 String() 변환)
 * - parentId: 대댓글이면 부모 댓글 id, 아니면 null
 */
export type Comment = {
  id: CommentId;

  targetType: CommentTargetType;
  targetId: number;

  content: string;
  parentId: CommentId | null;

  authorId?: string;
  authorName?: string;

  createdAt?: string; // ISO string (BE에서 안 주면 undefined)
};

/** 댓글 생성 입력(프론트 표준) */
export type CreateCommentInput = {
  targetType: CommentTargetType;
  targetId: number;
  content: string;
  parentId?: CommentId | null;
};

/** 댓글 수정 입력(프론트 표준) */
export type UpdateCommentInput = {
  content: string;
};

/** UI 핸들러(기존 컴포넌트와 호환) */
export type CommentHandlers = {
  onDelete: (id: CommentId) => void;
  onUpdate: (id: CommentId, content: string) => void;
  onAddReply: (parentId: CommentId, content: string) => void;
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
