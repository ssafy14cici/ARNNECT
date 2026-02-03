// src/features/feed/api/real.ts
import { http } from "../../../shared/api/http";
import type { FeedItem } from "../model/types";

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

  nickname?: string;
  authorName?: string;

  isArtist?: boolean | number;
  authorRole?: string;
};

function toFeedItem(v: unknown): FeedItem | null {
  if (!isObject(v)) return null;
  const x = v as RawFeed;

  const id = asString(x.id, "") || asString(x.artworkId, "") || asString(x.reviewId, "");
  if (!id) return null;

  const imageUrl = asString(x.imageUrl, "") || asString(x.thumbnailUrl, "");
  const createdAt = asString(x.createdAt, "") || asString(x.date, "");

  const roleFromField = asString(x.authorRole, "").toUpperCase();
  const authorRole =
    roleFromField === "ARTIST" || roleFromField === "USER"
      ? (roleFromField as "ARTIST" | "USER")
      : x.isArtist === true || x.isArtist === 1
        ? "ARTIST"
        : "USER";

  const authorId = asString(x.authorId, "") || asString(x.memberUuid, "");
  const authorName = asString(x.authorName, "") || asString(x.nickname, "") || "—";

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
