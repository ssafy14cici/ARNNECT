// FE/src/features/feed/api.ts
import { http } from "../../shared/api/http";
import type { FeedItem } from "./types";

/**
 * NOTE
 * - http의 baseURL이 이미 "/api/v1"를 포함하면, 아래 FEED_PATH에서 "/api/v1"를 제거해.
 * - 백엔드 실제 응답 필드명이 다를 수 있어서, mapper는 최대한 방어적으로 작성해둠.
 */
const FEED_PATH = "/api/v1/artworks/feed";

// ---------- helpers (no any) ----------
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
  // 서버가 공통 envelope: { isSuccess, data, ... } 형태면 data만 뽑아줌
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

  likes?: number;
  views?: number;

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

  const id =
    asString(x.id, "") ||
    asString(x.artworkId, "") ||
    asString(x.reviewId, "");

  const imageUrl = asString(x.imageUrl, "") || asString(x.thumbnailUrl, "");

  // 피드는 이미지 없는 경우도 있을 수 있는데, 지금 UI가 이미지 기반이면 필터링하는 게 안전
  if (!id || !imageUrl) return null;

  const createdAt = asString(x.createdAt, "") || asString(x.date, "");

  // authorRole 추론(명세/응답에 따라 달라질 수 있음)
  const roleFromField = asString(x.authorRole, "").toUpperCase();
  const role =
    roleFromField === "ARTIST" || roleFromField === "USER"
      ? (roleFromField as "ARTIST" | "USER")
      : (x.isArtist === true || x.isArtist === 1 ? "ARTIST" : "USER");

  const authorId =
    asString(x.authorId, "") ||
    asString(x.memberUuid, "");

  const authorName =
    asString(x.authorName, "") ||
    asString(x.nickname, "") ||
    "—";

  return {
    id,
    authorRole: role,
    title: asString(x.title, "Untitled"),
    excerpt: asString(x.content, ""),
    authorName,
    authorId,
    createdAt: createdAt || new Date().toISOString(),
    imageUrl,
    likes: asNumber(x.likes, 0),
    views: asNumber(x.views, 0),
    category: undefined,
  };
}

function normalizeFeedList(payload: unknown): FeedItem[] {
  const body = pickEnvelopeData(payload);

  // 1) data 자체가 배열인 케이스
  if (Array.isArray(body)) {
    return body
      .map(toFeedItem)
      .filter((it): it is FeedItem => it !== null);
  }

  // 2) data.items 형태
  if (isObject(body)) {
    const items = get(body, "items");
    if (Array.isArray(items)) {
      return items
        .map(toFeedItem)
        .filter((it): it is FeedItem => it !== null);
    }
  }

  return [];
}

/**
 * 피드 목록 조회 (실서버)
 * 실패 시: 빈 배열 반환 (목업/로컬 사용 안 함)
 */
export const getFeedList = async (): Promise<FeedItem[]> => {
  try {
    // axios 스타일 응답({ data })이거나, http 래퍼가 data만 리턴할 수도 있어서 둘 다 대응
    const res = await http.get(FEED_PATH);
    const payload =
      isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);

    return normalizeFeedList(payload);
  } catch {
    return [];
  }
};
