// FE/src/features/comments/api/index.ts
import type {
  Comment,
  CommentId,
  CommentTargetType,
  CreateCommentInput,
  UpdateCommentInput,
} from "../model/types";
import {
  countCommentsReal,
  createCommentReal,
  deleteCommentReal,
  listCommentsReal,
  updateCommentReal,
} from "./real";

export type CommentsApi = {
  list: (targetType: CommentTargetType, targetId: number) => Promise<Comment[]>;
  count: (targetType: CommentTargetType, targetId: number) => Promise<number>;
  create: (input: CreateCommentInput) => Promise<Comment>;
  update: (commentId: CommentId, patch: UpdateCommentInput) => Promise<void>;
  remove: (commentId: CommentId) => Promise<void>;
};

/**
 * (선택) 댓글 변경 이벤트
 * - 로컬스토리지는 제거했지만, 화면에서 “댓글 저장/삭제 후 리패치” 트리거가 필요하면 이 이벤트로 통일 가능
 */
const EVT = "arnnect_comments_updated";
export function dispatchCommentsUpdated() {
  window.dispatchEvent(new Event(EVT));
}
export function subscribeCommentsUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export const commentsApi: CommentsApi = {
  list: listCommentsReal,
  count: countCommentsReal,
  async create(input) {
    const c = await createCommentReal(input);
    dispatchCommentsUpdated();
    return c;
  },
  async update(commentId, patch) {
    await updateCommentReal(commentId, patch);
    dispatchCommentsUpdated();
  },
  async remove(commentId) {
    await deleteCommentReal(commentId);
    dispatchCommentsUpdated();
  },
};
