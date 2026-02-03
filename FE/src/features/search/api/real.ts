// src/features/search/api/real.ts
import { http } from "../../../shared/api/http";
import type { SearchArtwork } from "../model/types";

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
function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const arr = v.map((x) => asString(x, "")).map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof v === "string") {
    const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}
function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

type RawArtwork = {
  id?: string | number;
  artworkId?: string | number;

  src?: string;
  imageUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;

  title?: string;

  artist?: string;
  artistName?: string;

  likes?: number | string;
  views?: number | string;

  createdAt?: string;
  date?: string;

  tags?: unknown;

  uploader?: string;
  uploaderName?: string;
  authorName?: string;
  nickname?: string;
};

function toSearchArtwork(v: unknown): SearchArtwork | null {
  if (!isObject(v)) return null;
  const x = v as RawArtwork;

  const id = asString(x.artworkId, "") || asString(x.id, "");
  const src =
    asString(x.imageUrl, "") ||
    asString(x.thumbnailUrl, "") ||
    asString(x.thumbnail, "") ||
    asString(x.src, "");

  if (!id || !src) return null;

  const title = asString(x.title, "") || undefined;
  const artist =
    asString(x.artistName, "") ||
    asString(x.artist, "") ||
    asString(x.uploaderName, "") ||
    asString(x.authorName, "") ||
    asString(x.nickname, "") ||
    undefined;

  const createdAt = asString(x.createdAt, "") || asString(x.date, "") || undefined;

  return {
    id,
    src,
    thumbnail: asString(x.thumbnailUrl, "") || asString(x.thumbnail, "") || src,
    title,
    artist,
    likes: asNumber(x.likes, 0),
    views: asNumber(x.views, 0),
    createdAt,
    tags: asStringArray(x.tags),
    uploader: asString(x.uploader, "") || undefined,
  };
}

export async function fetchSearchArtworksReal(q: string): Promise<SearchArtwork[]> {
  const term = q.trim();
  const path = term
    ? `/api/v1/search?search=${encodeURIComponent(term)}`
    : `/api/v1/artworks/feed`;

  const res = await http.get(path);
  const payload = isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
  const body = pickEnvelopeData(payload);

  const arr = Array.isArray(body)
    ? body
    : isObject(body) && Array.isArray(get(body, "items"))
      ? (get(body, "items") as unknown[])
      : [];

  return arr.map(toSearchArtwork).filter((x): x is SearchArtwork => x !== null);
}
