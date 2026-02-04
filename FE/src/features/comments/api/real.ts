// FE/src/features/comments/api/real.ts
import { http } from "../../../shared/api/http";
import type {
  Comment,
  CommentId,
  CommentTargetType,
  CreateCommentInput,
  UpdateCommentInput,
} from "../model/types";
import { normalizeId, toParentCommentId } from "../model/types";

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** axios 응답의 envelope({data}) / raw 모두 대응 */
function pickData(raw: unknown): unknown {
  if (isRecord(raw) && "data" in raw) return raw.data;
  return raw;
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

function pickList(raw: unknown): unknown[] {
  const d = pickData(raw);
  if (Array.isArray(d)) return d;
  if (!isRecord(d)) return [];
  if (Array.isArray(d.items)) return d.items as unknown[];
  if (Array.isArray(d.content)) return d.content as unknown[];
  if (Array.isArray(d.results)) return d.results as unknown[];
  return [];
}

/**
 * BE CommentResponse:
 * {
 *  targetType: string,
 *  targetId: number,
 *  commentId: number,
 *  content: string,
 *  nickName: string,
 *  parentCommentId: number | null
 * }
 */
function normalizeCommentFromResponse(x: unknown, ctx?: { targetType: CommentTargetType; targetId: number }): Comment | null {
  if (!isRecord(x)) return null;

  const id = normalizeId(x.commentId ?? x.id ?? x.comment_id);
  if (!id) return null;

  const content = String(x.content ?? "").trim();

  const targetType =
    normalizeTargetType(x.targetType) ??
    normalizeTargetType(x.target) ??
    ctx?.targetType ??
    null;

  const targetId = asNumber(x.targetId ?? ctx?.targetId) ?? null;

  const parentRaw = x.parentCommentId ?? x.parentId ?? null;
  const parentId = parentRaw === null || parentRaw === undefined ? null : normalizeId(parentRaw);

  const authorName =
    typeof x.nickName === "string"
      ? x.nickName
      : typeof x.nickname === "string"
        ? x.nickname
        : typeof x.name === "string"
          ? x.name
          : undefined;

  const createdAt = typeof x.createdAt === "string" ? x.createdAt : undefined;

  if (!targetType || targetId === null) return null;

  return {
    id,
    targetType,
    targetId,
    content,
    parentId,
    authorName,
    createdAt,
  };
}

/**
 * ✅ 목록 조회
 * - 스샷 기준: GET /api/v1/comments?artworkId=1
 * - 흔들릴 수 있어서 후보 쿼리 여러 개 시도
 */
export async function listCommentsReal(
  targetType: CommentTargetType,
  targetId: number,
): Promise<Comment[]> {
  const id = encodeURIComponent(String(targetId));

  const candidates =
    targetType === "ARTWORK"
      ? [
          `/api/v1/comments?artworkId=${id}`, // ✅ screenshot
          `/api/v1/comments?artwork=${id}`,   // fallback
          `/api/v1/comments?target=${encodeURIComponent(targetType)}&id=${id}`, // fallback
        ]
      : [
          `/api/v1/comments?reviewId=${id}`, // 예상
          `/api/v1/comments?review=${id}`,   // fallback
          `/api/v1/comments?target=${encodeURIComponent(targetType)}&id=${id}`, // fallback
        ];

  for (const url of candidates) {
    try {
      const res = await http.get(url);
      const list = pickList(res.data);
      return list
        .map((it) => normalizeCommentFromResponse(it, { targetType, targetId }))
        .filter((v): v is Comment => Boolean(v));
    } catch {
      // next
    }
  }

  return [];
}

/**
 * ✅ 댓글 수
 * - 명세: GET /api/v1/comments/count?target=ARTWORK&id=1
 */
export async function countCommentsReal(
  targetType: CommentTargetType,
  targetId: number,
): Promise<number> {
  const t = encodeURIComponent(targetType);
  const id = encodeURIComponent(String(targetId));

  const candidates = [
    `/api/v1/comments/count?target=${t}&id=${id}`,
    `/api/v1/comments/count?targetType=${t}&targetId=${id}`,
  ];

  for (const url of candidates) {
    try {
      const res = await http.get(url);
      const d = pickData(res.data);

      if (typeof d === "number") return d;
      if (isRecord(d) && typeof d.count === "number") return d.count;
      if (isRecord(d) && typeof d.data === "number") return d.data;
      if (Array.isArray(d)) return d.length;
    } catch {
      // next
    }
  }

  return 0;
}

/**
 * ✅ 생성
 * POST /api/v1/comments
 * body: { targetType, targetId, content, parentCommentId }
 */
export async function createCommentReal(input: CreateCommentInput): Promise<Comment> {
  const body = {
    targetType: input.targetType,
    targetId: input.targetId,
    content: input.content,
    parentCommentId: toParentCommentId(input.parentId ?? null),
  };

  const res = await http.post("/api/v1/comments", body);
  const d = pickData(res.data);

  const normalized =
    normalizeCommentFromResponse(d, { targetType: input.targetType, targetId: input.targetId }) ??
    // 서버가 생성 결과를 안 주는 경우 fallback
    ({
      id: crypto.randomUUID(),
      targetType: input.targetType,
      targetId: input.targetId,
      content: input.content,
      parentId: input.parentId ?? null,
      createdAt: new Date().toISOString(),
    } as Comment);

  return normalized;
}

/**
 * ✅ 수정
 * PUT /api/v1/comments/{commentId}
 * - UpdateCommentRequest에 commentId가 body에도 있어서, 우선 둘 다 보내고
 *   400/422면 content만 보내는 fallback
 */
export async function updateCommentReal(commentId: CommentId, patch: UpdateCommentInput): Promise<void> {
  const pathId = encodeURIComponent(String(commentId));
  const numeric = asNumber(commentId);

  try {
    await http.put(`/api/v1/comments/${pathId}`, {
      commentId: numeric ?? undefined,
      content: patch.content,
    });
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 400 || status === 422) {
      await http.put(`/api/v1/comments/${pathId}`, { content: patch.content });
      return;
    }
    throw e;
  }
}

/**
 * ✅ 삭제
 * DELETE /api/v1/comments/{commentId}
 */
export async function deleteCommentReal(commentId: CommentId): Promise<void> {
  await http.delete(`/api/v1/comments/${encodeURIComponent(String(commentId))}`);
}
