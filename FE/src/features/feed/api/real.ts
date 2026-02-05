// src/features/feed/api/real.ts
import { http } from "../../../shared/api/http";
import type { FeedItem, FeedAuthorRole } from "../model/types";

/**
 * ✅ NOTE
 * - http의 baseURL이 이미 "/api/v1" 포함이면, 아래 PATH에서 "/api/v1" 제거
 */
const ARTWORK_FEED_PATH = "/api/v1/artworks/feed";

/**
 * ✅ REVIEW LIST API 후보들
 * - 프로젝트/BE 구현에 맞는 실제 경로로 정리해서 하나만 남기는 걸 권장
 * - 전부 실패하면 리뷰는 머지되지 않고(=유저 글 안 뜸), 작품 피드만 반환함
 */
const REVIEW_FEED_CANDIDATES = [
  "/api/v1/reviews/feed",
  "/api/v1/reviews",
  "/api/v1/reviews/all",
];

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
  // createdAt이 ISO string / number / Timestamp-string 등 섞여올 수 있어서 방어
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) return parsed;

    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  // 객체일 경우(드물게) valueOf()/toString() 시도
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
  // fallback: 지금 시간
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

  // 통합피드 기준 기본값은 USER가 더 안전(필터가 비어보이는 현상 방지)
  return "USER";
}

/**
 * ✅ Feed 전용 media url 정규화
 * - 공용 resolveMediaUrl을 건드리지 않고, Feed에서만 안정적으로 처리
 * - /artwork(s)/, /review(s)/ 모두 /src prefix 붙임 (DEV 프록시 환경 대응)
 * - DEV: 절대 URL이면 pathname으로 바꿔 프록시를 타게 함
 * - PROD: VITE_API_BASE_URL origin을 붙임
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

  role?: string; // 가끔 들어오는 경우 방어
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

  memberUuid?: string; // 작성자(유저)
  nickname?: string;

  // 리뷰에 딸려오는 작품의 작가 정보(작성자와 다름)
  artistUuid?: string; // memberUuid
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
    asString(x.artistMemberUuid, "") ||
    asString(x.authorId, "") ||
    asString(x.memberUuid, "");

  const authorName =
    asString(x.artistName, "") ||
    asString(x.authorName, "") ||
    asString(x.nickname, "") ||
    "—";

  const authorRole = normalizeRole(x.authorRole ?? x.role, "ARTWORK");

  return {
    id: `artwork-${artworkId}`,
    authorRole: authorRole === "ARTIST" ? "ARTIST" : "ARTIST", // 작품은 기본 ARTIST로 고정하는 게 안전
    title: asString(x.title, "Untitled"),
    excerpt: asString(x.content, ""),
    authorName,
    authorId,
    createdAt: createdAt ? toIso(createdAt) : new Date().toISOString(),
    imageUrl: imageUrl || undefined, // ✅ Feed 전용 정규화 적용
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
    authorRole: normalizeRole(x.authorRole ?? x.role, "REVIEW"), // 리뷰는 USER로 가정
    title: asString(x.title, "Review"),
    excerpt: asString(x.content, ""),
    authorName: asString(x.nickname, "—"),
    authorId: asString(x.memberUuid, ""),
    createdAt: createdAt ? toIso(createdAt) : new Date().toISOString(),
    imageUrl: imageUrl || undefined, // ✅ Feed 전용 정규화 적용
    likes: 0,
    views: 0,
    category: undefined,
  };
}

// ---------- fetch ----------
async function fetchPayload(path: string): Promise<unknown> {
  const res = await http.get(path);
  // http wrapper가 {data} 형태거나 data를 바로 주는 경우 모두 대응
  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
  return pickEnvelopeData(payload);
}

function sortByCreatedAtDesc(a: FeedItem, b: FeedItem): number {
  return toEpochMs(b.createdAt) - toEpochMs(a.createdAt);
}

async function fetchReviewFeedBestEffort(): Promise<FeedItem[]> {
  for (const path of REVIEW_FEED_CANDIDATES) {
    try {
      const body = await fetchPayload(path);
      const arr = extractArray(body);
      // 성공하면(빈 배열이어도) 그걸로 종료
      return arr.map(toFeedItemFromReview).filter((x): x is FeedItem => x !== null);
    } catch {
      // 다음 후보로 넘어감
      continue;
    }
  }
  return [];
}

// ---------- exported ----------
export async function getFeedListReal(): Promise<FeedItem[]> {
  // 1) 작품 피드는 필수
  const artworkBody = await fetchPayload(ARTWORK_FEED_PATH);
  const artworkArr = extractArray(artworkBody);
  const artworks = artworkArr.map(toFeedItemFromArtwork).filter((x): x is FeedItem => x !== null);

  // 2) 리뷰 피드는 best-effort (없으면 실패해도 작품만 보여줌)
  const reviews = await fetchReviewFeedBestEffort();

  // 3) merge + sort
  return [...artworks, ...reviews].sort(sortByCreatedAtDesc);
}
