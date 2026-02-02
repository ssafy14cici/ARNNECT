//FE/src/shared/types/models.ts
/** 작품 모델 */
export type Artwork = {
  id: string;
  src: string;
  title?: string;
  artist?: string;
  tags?: string[];
};

/** 댓글 / 대댓글 모델 */
export type CommentNode = {
  id: string;
  parentId: string | null;   // null이면 최상위 댓글
  content: string;
  author: string;
  createdAt: number;
};
