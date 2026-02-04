// FE/src/pages/artworks/detail/mappers.ts
import {
  asBool,
  asNumber,
  asString,
  asStringArray,
  get,
  isObject,
  pickEnvelopeData,
  resolveMediaUrl,
} from "./utils";

export type ArtworkDetailData = {
  id: string | number;
  src: string;
  title: string;
  artist: string;
  description: string;
  tags: string[];

  artistMemberUuid?: string;
  artistId?: string;
  artistName?: string;

  likeCount?: number;
  isFavorited?: boolean;
};

export function mapArtworkDetail(payload: unknown): ArtworkDetailData | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const idRaw = get(body, "artworkId") ?? get(body, "id");
  const idStr = asString(idRaw, "");
  const idNum = typeof idRaw === "number" ? idRaw : asNumber(idRaw, NaN);
  const id: string | number = Number.isFinite(idNum) ? idNum : idStr;

  const title = asString(get(body, "title"), "Untitled");
  const description = asString(get(body, "description"), "") || asString(get(body, "content"), "");

  const rawSrc =
    asString(get(body, "imageUrl"), "") ||
    asString(get(body, "thumbnailUrl"), "") ||
    asString(get(body, "src"), "");
  const src = resolveMediaUrl(rawSrc);

  const tags = asStringArray(get(body, "tags")) || asStringArray(get(body, "tagList")) || [];

  const artistMemberUuid =
    asString(get(body, "artistMemberUuid"), "") ||
    asString(get(body, "artistUuid"), "") ||
    asString(get(body, "artistId"), "") ||
    asString(get(body, "memberUuid"), "") ||
    "";

  const artistName =
    asString(get(body, "artistName"), "") ||
    asString(get(body, "artist"), "") ||
    asString(get(body, "nickname"), "") ||
    "";

  const artist = artistName || (artistMemberUuid ? `ARTIST ${artistMemberUuid.slice(0, 4)}` : "Unknown");

  // ✅ BE: likeCount
  const likeCount = asNumber(
    get(body, "likeCount"),
    asNumber(get(body, "favoriteCount"), asNumber(get(body, "count"), NaN)),
  );

  // (있으면) 서버가 좋아요 여부도 내려주는 케이스 흡수
  const isFavorited = asBool(
    get(body, "isFavorited"),
    asBool(get(body, "favorited"), asBool(get(body, "isFavorite"), false)),
  );

  if (!id || !src) return null;

  return {
    id,
    src,
    title,
    artist,
    description: description || "설명이 없습니다.",
    tags: tags.length ? tags : ["현대미술"],
    artistMemberUuid: artistMemberUuid || undefined,
    artistId: artistMemberUuid || undefined,
    artistName: artistName || undefined,
    likeCount: Number.isFinite(likeCount) ? likeCount : undefined,
    isFavorited: typeof isFavorited === "boolean" ? isFavorited : undefined,
  };
}

export type ReviewSummary = {
  reviewId: string | number;
  title: string;
  imageUrl?: string;
};

function mapReviewSummary(v: unknown): ReviewSummary | null {
  if (!isObject(v)) return null;

  const reviewIdRaw = get(v, "reviewId") ?? get(v, "id");
  const reviewId = typeof reviewIdRaw === "number" ? reviewIdRaw : asString(reviewIdRaw, "").trim();
  if (!reviewId && reviewId !== 0) return null;

  const title = asString(get(v, "title"), "Untitled");
  const imageUrl = asString(get(v, "imageUrl"), "").trim();

  return { reviewId, title, imageUrl: imageUrl || undefined };
}

export function mapReviewList(payload: unknown): ReviewSummary[] {
  const body = pickEnvelopeData(payload);

  if (Array.isArray(body)) return body.map(mapReviewSummary).filter(Boolean) as ReviewSummary[];

  if (isObject(body)) {
    const arr = get(body, "items") ?? get(body, "reviews") ?? get(body, "content") ?? get(body, "list");
    if (Array.isArray(arr)) return arr.map(mapReviewSummary).filter(Boolean) as ReviewSummary[];
  }
  return [];
}

/** UI에서 쓸 댓글 모델 */
export type LocalComment = {
  id: string;
  parentId: string | null;
  content: string;
  authorName?: string;
  createdAt?: string;
};

/**
 * BE CommentResponse:
 * - commentId, parentCommentId, content, nickName, targetType, targetId
 */
export function mapCommentResponseList(payload: unknown): LocalComment[] {
  const body = pickEnvelopeData(payload);

  const arr = Array.isArray(body)
    ? body
    : isObject(body)
      ? (get(body, "items") ?? get(body, "comments") ?? get(body, "content") ?? get(body, "list"))
      : null;

  if (!Array.isArray(arr)) return [];

  return arr
    .map((v) => {
      if (!isObject(v)) return null;

      const commentIdRaw = get(v, "commentId") ?? get(v, "id");
      const commentId = typeof commentIdRaw === "number" ? commentIdRaw : asString(commentIdRaw, "").trim();
      if (commentId === "" || commentId == null) return null;

      const parentRaw = get(v, "parentCommentId");
      const parentIdNum = typeof parentRaw === "number" ? parentRaw : asNumber(parentRaw, NaN);
      const parentIdStr = asString(parentRaw, "").trim();
      const parentId = Number.isFinite(parentIdNum) ? String(parentIdNum) : parentIdStr ? parentIdStr : null;

      const content = asString(get(v, "content"), "").trim();

      const authorName =
        asString(get(v, "nickName"), "").trim() ||
        asString(get(v, "nickname"), "").trim() ||
        "User";

      return { id: String(commentId), parentId, content, authorName } satisfies LocalComment;
    })
    .filter(Boolean) as LocalComment[];
}

export function mapSingleComment(payload: unknown): LocalComment | null {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return null;

  const commentIdRaw = get(body, "commentId") ?? get(body, "id");
  const commentId = typeof commentIdRaw === "number" ? commentIdRaw : asString(commentIdRaw, "").trim();
  if (commentId === "" || commentId == null) return null;

  const parentRaw = get(body, "parentCommentId");
  const parentIdNum = typeof parentRaw === "number" ? parentRaw : asNumber(parentRaw, NaN);
  const parentIdStr = asString(parentRaw, "").trim();
  const parentId = Number.isFinite(parentIdNum) ? String(parentIdNum) : parentIdStr ? parentIdStr : null;

  const content = asString(get(body, "content"), "").trim();
  const authorName =
    asString(get(body, "nickName"), "").trim() ||
    asString(get(body, "nickname"), "").trim() ||
    "User";

  return { id: String(commentId), parentId, content, authorName };
}

export type FavoriteToggleResult = {
  isFavorited?: boolean;
  likeCount?: number;
};

export function parseFavoriteToggleResult(payload: unknown): FavoriteToggleResult {
  const body = pickEnvelopeData(payload);
  if (!isObject(body)) return {};

  const isFavorited = asBool(
    get(body, "isFavorited"),
    asBool(get(body, "favorited"), asBool(get(body, "isFavorite"), undefined as any)),
  );

  // ✅ BE는 likeCount 가능성이 가장 큼
  const likeCount = asNumber(
    get(body, "likeCount"),
    asNumber(get(body, "favoriteCount"), asNumber(get(body, "count"), undefined as any)),
  );

  const out: FavoriteToggleResult = {};
  if (typeof isFavorited === "boolean") out.isFavorited = isFavorited;
  if (typeof likeCount === "number" && Number.isFinite(likeCount)) out.likeCount = likeCount;
  return out;
}
