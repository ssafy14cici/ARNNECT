// src/features/feed/api/real.ts
import { http } from "../../../shared/api/http";
import type { FeedItem, FeedAuthorRole } from "../model/types";

/**
 * NOTE
 * - http의 baseURL이 이미 "/api/v1" 포함이면, 아래 PATH에서 "/api/v1" 제거
 */
const FEED_PATH = "/api/v1/artworks/feed";

// ---------- helpers ----------
type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickEnvelopeData(raw: unknown): unknown {
  // { data: ... } envelope면 data만 사용
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

// ✅ role 값이 여러 형태로 올 수 있으니 FE 표준("ARTIST"|"USER")으로 정규화
function normalizeRole(rawRole: unknown, isArtistHint?: unknown): FeedAuthorRole {
  const s = asString(rawRole, "").trim();
  const upper = s.toUpperCase();

  if (upper === "ARTIST") return "ARTIST";
  if (upper === "USER") return "USER";

  // BE에서 "general"을 쓰는 경우
  if (upper === "GENERAL") return "USER";

  // 소문자 방어
  const lower = s.toLowerCase();
  if (lower === "artist") return "ARTIST";
  if (lower === "general") return "USER";
  if (lower === "user") return "USER";

  // 힌트 필드가 있다면 사용
  if (isArtistHint === true || isArtistHint === 1) return "ARTIST";

  // feed endpoint가 artworks/feed면 기본은 ARTIST로 잡는게 안전
  return "ARTIST";
}

// ✅ feed id는 반드시 prefix 강제해서 DETAIL_PATH가 안정적으로 동작하게 함
function buildCanonicalId(raw: {
  artworkId?: unknown;
  reviewId?: unknown;
  id?: unknown;
}): { id: string; kind: "ARTWORK" | "REVIEW" | "UNKNOWN" } {
  const artworkId = asString(raw.artworkId, "");
  const reviewId = asString(raw.reviewId, "");
  const baseId = asString(raw.id, "");

  if (artworkId) return { id: `artwork-${artworkId}`, kind: "ARTWORK" };
  if (reviewId) return { id: `review-${reviewId}`, kind: "REVIEW" };

  // 이미 prefix가 붙어서 오는 케이스면 유지
  if (baseId.startsWith("artwork-")) return { id: baseId, kind: "ARTWORK" };
  if (baseId.startsWith("review-")) return { id: baseId, kind: "REVIEW" };

  // feed가 artworks/feed라면 id 하나만 올 수도 있음 -> artwork로 간주
  if (baseId) return { id: `artwork-${baseId}`, kind: "ARTWORK" };

  return { id: "", kind: "UNKNOWN" };
}

type RawFeed = {
  id?: string | number;
  artworkId?: string | number;
  reviewId?: string | number;

  title?: string;
  content?: string;

  imageUrl?: string;
  thumbnailUrl?: string;

  createdAt?: string;
  date?: string;

  likes?: number | string;
  views?: number | string;

  authorId?: string | number;
  memberUuid?: string;
  artistMemberUuid?: string; // ✅ 자주 쓰는 케이스 대비

  nickname?: string;
  authorName?: string;
  artistName?: string;

  isArtist?: boolean | number;
  authorRole?: string;
  role?: string;
};

function toFeedItem(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;
  const x = v as RawFeed;

  // ✅ id: prefix 강제
  const { id } = buildCanonicalId({ artworkId: x.artworkId, reviewId: x.reviewId, id: x.id });
  if (!id) return null;

  const imageUrl = asString(x.imageUrl, "") || asString(x.thumbnailUrl, "");
  const createdAt = asString(x.createdAt, "") || asString(x.date, "");

  // ✅ authorRole: "artist/general" 등 정규화
  const authorRole = normalizeRole(x.authorRole ?? x.role, x.isArtist);

  // ✅ authorId: artworks/feed면 보통 artistMemberUuid가 있음
  const authorId =
    asString(x.artistMemberUuid, "") ||
    asString(x.authorId, "") ||
    asString(x.memberUuid, "");

  const authorName =
    asString(x.artistName, "") ||
    asString(x.authorName, "") ||
    asString(x.nickname, "") ||
    "—";

  return {
    id,
    authorRole,

    title: asString(x.title, "Untitled"),
    excerpt: asString(x.content, ""),

    authorName,
    authorId,

    createdAt: createdAt || new Date().toISOString(),
    imageUrl: imageUrl || undefined,

    likes: asNumber(x.likes, 0),
    views: asNumber(x.views, 0),
    category: undefined,
  };
}

function normalizeFeedList(payload: unknown): FeedItem[] {
  const body = pickEnvelopeData(payload);

  if (Array.isArray(body)) {
    return body.map(toFeedItem).filter((x): x is FeedItem => x !== null);
  }

  if (isObject(body)) {
    const items = get(body, "items");
    if (Array.isArray(items)) {
      return items.map(toFeedItem).filter((x): x is FeedItem => x !== null);
    }
  }

  return [];
}

export async function getFeedListReal(): Promise<FeedItem[]> {
  const res = await http.get(FEED_PATH);

  // http wrapper가 {data} 형태거나 data를 바로 주는 경우 모두 대응
  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
  return normalizeFeedList(payload);
}
