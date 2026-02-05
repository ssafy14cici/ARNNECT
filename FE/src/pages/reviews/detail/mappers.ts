// FE/src/pages/reviews/detail/mappers.ts
import { isObject } from "../../artworks/detail/utils";

type JsonObject = Record<string, unknown>;

function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
function asNumber(v: unknown, fallback = NaN): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function asBool(v: unknown, fallback: boolean | undefined = undefined): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return fallback;
}

function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  // 백엔드가 data/result 중 뭘 쓰든 방어
  return (raw as any).data ?? (raw as any).result ?? raw;
}

/** UI에서 쓸 댓글 모델 */
export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorName?: string;
  authorUuid?: string;
  createdAt?: string;
};

/**
 * BE CommentResponse 후보:
 * - commentId / id
 * - parentCommentId
 * - content
 * - nickName / nickname / authorName / name
 * - memberUuid / authorUuid / authorId / writerUuid / userUuid ...
 * - createdAt
 */
function pickAuthorUuid(o: JsonObject): string {
  return (
    asString(get(o, "memberUuid"), "").trim() ||
    asString(get(o, "authorUuid"), "").trim() ||
    asString(get(o, "authorId"), "").trim() ||
    asString(get(o, "writerUuid"), "").trim() ||
    asString(get(o, "userUuid"), "").trim() ||
    asString(get(o, "userId"), "").trim()
  );
}

function pickAuthorName(o: JsonObject): string {
  return (
    asString(get(o, "nickName"), "").trim() ||
    asString(get(o, "nickname"), "").trim() ||
    asString(get(o, "authorName"), "").trim() ||
    asString(get(o, "name"), "").trim() ||
    "User"
  );
}

function pickCreatedAt(o: JsonObject): string {
  return (
    asString(get(o, "createdAt"), "").trim() ||
    asString(get(o, "createAt"), "").trim() ||
    asString(get(o, "created_at"), "").trim()
  );
}

export function mapCommentResponseList(payload: unknown): LocalComment[] {
  const body = pickEnvelopeData(payload);

  const arr = Array.isArray(body)
    ? body
    : isObject(body)
      ? ((body as any).items ??
        (body as any).comments ??
        (body as any).content ??
        (body as any).list ??
        (body as any).data)
      : null;

  if (!Array.isArray(arr)) return [];

  return arr
    .map((v) => {
      if (!isObject(v)) return null;
      const o = v as JsonObject;

      const commentIdRaw = get(o, "commentId") ?? get(o, "id");
      const commentId = typeof commentIdRaw === "number" ? String(commentIdRaw) : asString(commentIdRaw, "").trim();
      if (!commentId) return null;

      const parentRaw = get(o, "parentCommentId");
      const parentIdNum = asNumber(parentRaw, NaN);
      const parentIdStr = asString(parentRaw, "").trim();
      const parentId = Number.isFinite(parentIdNum) ? String(parentIdNum) : parentIdStr ? parentIdStr : null;

      const content = asString(get(o, "content"), "").trim();

      const authorName = pickAuthorName(o);
      const authorUuid = pickAuthorUuid(o);
      const createdAt = pickCreatedAt(o);

      return {
        id: commentId,
        parentId,
        content,
        authorName,
        authorUuid: authorUuid || undefined,
        createdAt: createdAt || undefined,
      } satisfies LocalComment;
    })
    .filter(Boolean) as LocalComment[];
}

export function mapSingleComment(payload: unknown): LocalComment | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const o = body as JsonObject;

  const commentIdRaw = get(o, "commentId") ?? get(o, "id");
  const commentId = typeof commentIdRaw === "number" ? String(commentIdRaw) : asString(commentIdRaw, "").trim();
  if (!commentId) return null;

  const parentRaw = get(o, "parentCommentId");
  const parentIdNum = asNumber(parentRaw, NaN);
  const parentIdStr = asString(parentRaw, "").trim();
  const parentId = Number.isFinite(parentIdNum) ? String(parentIdNum) : parentIdStr ? parentIdStr : null;

  const content = asString(get(o, "content"), "").trim();

  const authorName = pickAuthorName(o);
  const authorUuid = pickAuthorUuid(o);
  const createdAt = pickCreatedAt(o);

  return {
    id: commentId,
    parentId,
    content,
    authorName,
    authorUuid: authorUuid || undefined,
    createdAt: createdAt || undefined,
  };
}

export type FollowToggleResult = { isFollowing?: boolean };
export function parseFollowToggleResult(payload: unknown): FollowToggleResult {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return {};

  const o = body as JsonObject;
  const isFollowing = asBool(get(o, "isFollowing"), asBool(get(o, "following"), asBool(get(o, "isFollow"))));

  const out: FollowToggleResult = {};
  if (typeof isFollowing === "boolean") out.isFollowing = isFollowing;
  return out;
}
