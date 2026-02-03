// FE/src/features/comments/api/real.ts
import { http } from "../../../shared/api/http";
import type {
  Comment,
  CommentId,
  CommentTargetType,
  CreateCommentInput,
  UpdateCommentInput,
} from "../model/types";

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeTargetType(v: unknown): CommentTargetType | null {
  const s = String(v ?? "").toUpperCase().trim();
  if (s === "ARTWORK") return "ARTWORK";
  if (s === "REVIEW") return "REVIEW";
  return null;
}

function pickData(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) return raw.data;
  return raw;
}

function pickList(raw: unknown): unknown[] {
  const d = pickData(raw);
  if (Array.isArray(d)) return d;
  if (!isRecord(d)) return [];
  if (Array.isArray(d.items)) return d.items as unknown[];
  if (Array.isArray(d.content)) return d.content as unknown[];
  if (Array.isArray(d.results)) return d.results as unknown[];
  return [];
}

type NormalizeCtx = { targetType: CommentTargetType; targetId: number };

function normalizeComment(x: unknown, ctx?: NormalizeCtx): Comment | null {
  if (!isRecord(x)) return null;

  const id = asString(x.id ?? x.commentId ?? "");
  if (!id) return null;

  const content = asString(x.content ?? "");
  const parentIdRaw = x.parentId ?? x.parentCommentId ?? null;
  const parentId =
    parentIdRaw === null || parentIdRaw === undefined ? null : String(parentIdRaw);

  const createdAt = typeof x.createdAt === "string" ? x.createdAt : undefined;

  const authorId =
    typeof x.authorId === "string"
      ? x.authorId
      : typeof x.memberUuid === "string"
        ? x.memberUuid
        : undefined;

  const authorName =
    typeof x.authorName === "string"
      ? x.authorName
      : typeof x.nickname === "string"
        ? x.nickname
        : typeof x.name === "string"
          ? x.name
          : undefined;

  // ✅ targetType/targetId: 서버가 주면 쓰고, 없으면 ctx로 채움
  const targetType =
    normalizeTargetType(x.targetType ?? x.target ?? x.type) ?? ctx?.targetType ?? null;

  const targetId =
    asNumber(x.targetId ?? x.target_id ?? x.idTarget ?? x.target) ?? ctx?.targetId ?? null;

  if (!targetType || targetId === null) return null;

  return {
    id,
    targetType,
    targetId,
    content,
    parentId,
    createdAt,
    authorId,
    authorName,
  };
}

/**
 * ✅ 목록 조회
 */
export async function listCommentsReal(
  targetType: CommentTargetType,
  targetId: number,
): Promise<Comment[]> {
  // 백엔드 명세/구현이 흔들릴 수 있어서 후보 URL 여러 개 시도
  const tryUrls: string[] =
    targetType === "ARTWORK"
      ? [`/api/v1/comments?artwork=${encodeURIComponent(String(targetId))}`]
      : [
          `/api/v1/comments?review=${encodeURIComponent(String(targetId))}`,
          `/api/v1/comments?target=${encodeURIComponent(targetType)}&id=${encodeURIComponent(
            String(targetId),
          )}`,
        ];

  for (const u of tryUrls) {
    try {
      const res = await http.get(u);
      const list = pickList(res.data);
      return list
        .map((it) => normalizeComment(it, { targetType, targetId }))
        .filter((v): v is Comment => Boolean(v));
    } catch {
      // next
    }
  }

  return [];
}

/**
 * ✅ 댓글 수
 */
export async function countCommentsReal(
  targetType: CommentTargetType,
  targetId: number,
): Promise<number> {
  const res = await http.get(
    `/api/v1/comments/count?target=${encodeURIComponent(targetType)}&id=${encodeURIComponent(
      String(targetId),
    )}`,
  );

  const d = pickData(res.data);

  if (typeof d === "number") return d;
  if (isRecord(d) && typeof d.count === "number") return d.count;
  if (Array.isArray(d)) return d.length;

  return 0;
}

/**
 * ✅ 생성
 */
export async function createCommentReal(input: CreateCommentInput): Promise<Comment> {
  const body = {
    targetType: input.targetType,
    targetId: input.targetId,
    content: input.content,
    parentCommentId: input.parentId ?? null,
  };

  const res = await http.post("/api/v1/comments", body);
  const d = pickData(res.data);

  const normalized = normalizeComment(d, { targetType: input.targetType, targetId: input.targetId });
  if (normalized) return normalized;

  // 서버가 생성 댓글을 안 주는 케이스 fallback
  return {
    id: asString((d as any)?.id ?? (d as any)?.commentId ?? crypto.randomUUID()),
    targetType: input.targetType,
    targetId: input.targetId,
    content: input.content,
    parentId: input.parentId ?? null,
    createdAt: new Date().toISOString(),
    authorId: undefined,
    authorName: undefined,
  };
}

/**
 * ✅ 수정
 */
export async function updateCommentReal(
  commentId: CommentId,
  patch: UpdateCommentInput,
): Promise<void> {
  await http.put(`/api/v1/comments/${encodeURIComponent(String(commentId))}`, {
    content: patch.content,
  });
}

/**
 * ✅ 삭제
 */
export async function deleteCommentReal(commentId: CommentId): Promise<void> {
  await http.delete(`/api/v1/comments/${encodeURIComponent(String(commentId))}`);
}
