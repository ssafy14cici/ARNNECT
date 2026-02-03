// FE/src/features/artwork/types.ts

export type CommentId = string;

export type Comment = {
  id: CommentId;
  content: string;
  parentId: CommentId | null;
  createdAt?: string; // ISO
  authorId?: string;
  authorName?: string;
};

export type CommentHandlers = {
  onDelete: (id: CommentId) => void;
  onUpdate: (id: CommentId, content: string) => void;
  onAddReply: (parentId: CommentId, content: string) => void;
};

export type ProfilePathFn = (authorId: string) => string;
