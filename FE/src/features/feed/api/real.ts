// src/features/feed/api/real.ts
import { http } from "../../../shared/api/http";
import type { FeedItem, FeedAuthorRole } from "../model/types";

/**
 * ✅ 공개 피드 정책
 * - 피드는 로그인 여부와 무관하게 누구나 볼 수 있어야 함
 * - 로그인 상태에서 Authorization 붙으면 BE가 500 내는 이슈가 있어서,
 *   피드 요청은 항상 x-skip-auth=1로 "토큰 없이" 호출한다.
 */
const PUBLIC_HEADERS = { "x-skip-auth": "1" as const };

/**
 * ✅ NOTE
 * - http의 baseURL이 이미 "/api/v1" 포함이면, 아래 PATH에서 "/api/v1" 제거
 */
const ARTWORK_FEED_PATH = "/api/v1/artworks/feed";

/**
 * ✅ REVIEW LIST API 후보들
 * - 프로젝트/BE 구현에 맞는 실제 경로로 정리해서 하나만 남기는 걸 권장
 * - 전부 실패하면 리뷰는 머지되지 않고, 작품 피드만 반환함
 */
const REVIEW_FEED_CANDIDATES = ["/api/v1/reviews/feed", "/api/v1/reviews", "/api/v1/reviews/all"];

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

function toEpochMs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) return parsed;

    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  if (isObject(v)) {
    const s = asString((v as any).toString?.(), "");
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

function toIso(v: unknown): string {
  const ms = toEpochMs(v);
  if (ms > 0) return new Date(ms).toISOString();
  return new Date().toISOString();
}

function pickEnvelopeData(raw: unknown): unknown {
  // { data: ... } envelope면 data만 사용
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

function extractArray(body: unknown): unknown[] {
  // 응답이 배열이거나, Page/content/items 형태일 수 있어서 최대한 커버
  if (Array.isArray(body)) return body;

  if (isObject(body)) {
    const keys = ["items", "content", "list", "results", "result"];
    for (const k of keys) {
      const v = get(body, k);
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function normalizeRole(rawRole: unknown, kind?: "ARTWORK" | "REVIEW" | "UNKNOWN"): FeedAuthorRole {
  const s = asString(rawRole, "").trim();
  const upper = s.toUpperCase();

  if (upper === "ARTIST") return "ARTIST";
  if (upper === "USER") return "USER";
  if (upper === "GENERAL") return "USER";

  const lower = s.toLowerCase();
  if (lower === "artist") return "ARTIST";
  if (lower === "user" || lower === "general") return "USER";

  // kind 힌트 기반
  if (kind === "REVIEW") return "USER";
  if (kind === "ARTWORK") return "ARTIST";

  return "USER";
}

/**
 * ✅ Feed 전용 media url 정규화
 */
function resolveFeedMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const needsSrcPrefix = (p: string) =>
    !p.startsWith("/src/") && /^\/(artwork|artworks|review|reviews)\//i.test(p);

  const isDev = !!import.meta.env.DEV;

  // 1) 절대 URL 처리
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);

      if (needsSrcPrefix(url.pathname)) {
        url.pathname = `/src${url.pathname}`;
      }

      // ✅ DEV에서는 절대 URL을 상대경로로 바꿔서 프록시 타게
      if (isDev) {
        return `${url.pathname}${url.search}${url.hash}`;
      }

      return url.toString();
    } catch {
      return u0;
    }
  }

  // 2) 상대 경로 처리
  let path = u0.startsWith("/") ? u0 : `/${u0}`;

  if (needsSrcPrefix(path)) {
    path = `/src${path}`;
  }

  // ✅ DEV: 프록시
  if (isDev) return path;

  // ✅ PROD: VITE_API_BASE_URL origin 붙이기
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }

  return origin ? `${origin}${path}` : path;
}

// ---------- Raw types ----------
type RawArtworkFeed = {
  artworkId?: string | number;
  id?: string | number;

  title?: string;
  content?: string;

  imageUrl?: string | null;
  thumbnailUrl?: string | null;

  createdAt?: string | number;
  date?: string;

  likes?: number | string;
  views?: number | string;

  // 작가 정보(케이스별로 다를 수 있음)
  artistMemberUuid?: string;
  memberUuid?: string;
  authorId?: string | number;

  artistName?: string;
  nickname?: string;
  authorName?: string;

  role?: string;
  authorRole?: string;
};

type RawReviewFeed = {
  reviewId?: string | number;
  id?: string | number;

  artworkId?: string | number;
  artworkTitle?: string;

  title?: string;
  content?: string;

  imageUrl?: string | null;

  createdAt?: string | number;

  memberUuid?: string;
  nickname?: string;

  artistUuid?: string;
  artistName?: string;

  role?: string;
  authorRole?: string;

  tags?: string[];
};

function toFeedItemFromArtwork(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;
  const x = v as RawArtworkFeed;

  const artworkId = asString(x.artworkId ?? x.id, "");
  if (!artworkId) return null;

  const imageUrlRaw = asString(x.imageUrl, "") || asString(x.thumbnailUrl, "");
  const imageUrl = resolveFeedMediaUrl(imageUrlRaw);

  const createdAt = asString(x.createdAt, "") || asString(x.date, "");

  const authorId =
    asString(x.artistMemberUuid, "") || asString(x.authorId, "") || asString(x.memberUuid, "");

  const authorName =
    asString(x.artistName, "") || asString(x.authorName, "") || asString(x.nickname, "") || "—";

  // 작품은 기본적으로 ARTIST로 고정(필터 안정)
  return {
    id: `artwork-${artworkId}`,
    authorRole: "ARTIST",
    title: asString(x.title, "Untitled"),
    excerpt: asString(x.content, ""),
    authorName,
    authorId,
    createdAt: createdAt ? toIso(createdAt) : new Date().toISOString(),
    imageUrl: imageUrl || undefined,
    likes: asNumber(x.likes, 0),
    views: asNumber(x.views, 0),
    category: undefined,
  };
}

function toFeedItemFromReview(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;
  const x = v as RawReviewFeed;

  const reviewId = asString(x.reviewId ?? x.id, "");
  if (!reviewId) return null;

  const createdAt = asString(x.createdAt, "");

  const imageUrlRaw = asString(x.imageUrl, "");
  const imageUrl = resolveFeedMediaUrl(imageUrlRaw);

  return {
    id: `review-${reviewId}`,
    authorRole: normalizeRole(x.authorRole ?? x.role, "REVIEW"),
    title: asString(x.title, "Review"),
    excerpt: asString(x.content, ""),
    authorName: asString(x.nickname, "—"),
    authorId: asString(x.memberUuid, ""),
    createdAt: createdAt ? toIso(createdAt) : new Date().toISOString(),
    imageUrl: imageUrl || undefined,
    likes: 0,
    views: 0,
    category: undefined,
  };
}

// ---------- fetch (public only) ----------
async function fetchPayloadPublic(path: string): Promise<unknown> {
  const res = await http.get(path, { headers: PUBLIC_HEADERS });

  // axios response면 res.data가 본문
  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
  return pickEnvelopeData(payload);
}

async function fetchReviewFeedBestEffortPublic(): Promise<FeedItem[]> {
  for (const path of REVIEW_FEED_CANDIDATES) {
    try {
      const body = await fetchPayloadPublic(path);
      const arr = extractArray(body);
      return arr.map(toFeedItemFromReview).filter((x): x is FeedItem => x !== null);
    } catch {
      continue;
    }
  }
  return [];
}

// ---------- sorting ----------
function isArtworkItem(it: FeedItem): boolean {
  return it.id.startsWith("artwork-");
}

function typeRank(it: FeedItem): number {
  // ✅ 작품 먼저, 그 다음 리뷰
  if (isArtworkItem(it)) return 0;
  if (it.id.startsWith("review-")) return 1;
  return 2;
}

function sortArtworkFirstThenCreatedAtDesc(a: FeedItem, b: FeedItem): number {
  const t = typeRank(a) - typeRank(b);
  if (t !== 0) return t;

  // 같은 타입끼리는 최신순
  const d = toEpochMs(b.createdAt) - toEpochMs(a.createdAt);
  if (d !== 0) return d;

  // 완전 동률이면 id로 고정(결과 안정화)
  return a.id.localeCompare(b.id);
}

// ---------- exported ----------
export async function getFeedListReal(): Promise<FeedItem[]> {
  // 1) 작품 피드 (공개 + best-effort)
  let artworks: FeedItem[] = [];
  try {
    const artworkBody = await fetchPayloadPublic(ARTWORK_FEED_PATH);
    const artworkArr = extractArray(artworkBody);
    artworks = artworkArr.map(toFeedItemFromArtwork).filter((x): x is FeedItem => x !== null);
  } catch (e) {
    // 작품 피드가 터져도 화면이 완전 흰화면 되는 건 막기
    console.error("[feed] artwork feed failed:", e);
    artworks = [];
  }

  // 2) 리뷰 피드 (공개 + best-effort)
  let reviews: FeedItem[] = [];
  try {
    reviews = await fetchReviewFeedBestEffortPublic();
  } catch (e) {
    console.error("[feed] review feed failed:", e);
    reviews = [];
  }

  // 3) merge + sort
  return [...artworks, ...reviews].sort(sortArtworkFirstThenCreatedAtDesc);
}
