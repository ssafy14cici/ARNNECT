// FE/src/features/comments/api/index.ts
import { USE_MOCK } from "../../../shared/config/env";
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

const KEY = "arnnect_mock_comments_v1";
const EVT = "arnnect_comments_updated";

type MockStoredComment = Comment & { isDeleted?: boolean };

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAll(): MockStoredComment[] {
  return safeParse<MockStoredComment[]>(localStorage.getItem(KEY), []);
}

function writeAll(list: MockStoredComment[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function subscribeCommentsUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

/* ---------------- MOCK ---------------- */

function listCommentsMock(targetType: CommentTargetType, targetId: number): Comment[] {
  return readAll()
    .filter((c) => !c.isDeleted)
    .filter((c) => c.targetType === targetType && c.targetId === targetId)
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
}

function countCommentsMock(targetType: CommentTargetType, targetId: number): number {
  return listCommentsMock(targetType, targetId).length;
}

async function createCommentMock(input: CreateCommentInput): Promise<Comment> {
  const next: MockStoredComment = {
    id: uid(),
    targetType: input.targetType,
    targetId: input.targetId,
    content: input.content,
    parentId: input.parentId ?? null,
    createdAt: new Date().toISOString(),
  };
  writeAll([next, ...readAll()]);
  return next;
}

async function updateCommentMock(commentId: CommentId, patch: UpdateCommentInput): Promise<void> {
  const list = readAll();
  const idx = list.findIndex((c) => String(c.id) === String(commentId));
  if (idx < 0) return;
  list[idx] = { ...list[idx], content: patch.content };
  writeAll(list);
}

async function deleteCommentMock(commentId: CommentId): Promise<void> {
  const list = readAll();
  writeAll(list.map((c) => (String(c.id) === String(commentId) ? { ...c, isDeleted: true } : c)));
}

/* ---------------- Public API ---------------- */

export const commentsApi: CommentsApi = {
  list(targetType, targetId) {
    if (USE_MOCK) return Promise.resolve(listCommentsMock(targetType, targetId));
    return listCommentsReal(targetType, targetId);
  },
  count(targetType, targetId) {
    if (USE_MOCK) return Promise.resolve(countCommentsMock(targetType, targetId));
    return countCommentsReal(targetType, targetId);
  },
  create(input) {
    if (USE_MOCK) return createCommentMock(input);
    return createCommentReal(input);
  },
  update(commentId, patch) {
    if (USE_MOCK) return updateCommentMock(commentId, patch);
    return updateCommentReal(commentId, patch);
  },
  remove(commentId) {
    if (USE_MOCK) return deleteCommentMock(commentId);
    return deleteCommentReal(commentId);
  },
};
