import { http } from "../../../shared/api/http";

type JsonRecord = Record<string, unknown>;
function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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

// axios response면 res.data를 꺼냄
function unwrapAxios(res: unknown): unknown {
  return isRecord(res) && "data" in res ? (res as { data: unknown }).data : res;
}

// { success, data } 엔벨롭이면 data만 꺼냄 (프로젝트에서 자주 쓰는 패턴)
function unwrapEnvelope<T>(raw: unknown): T {
  if (isRecord(raw) && "data" in raw) return (raw as { data: T }).data;
  return raw as T;
}

// 서버가 배열 / 페이지(content) / items / results 등으로 줄 수도 있어서 흡수
function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;

  if (isRecord(raw)) {
    const content = raw["content"];
    if (Array.isArray(content)) return content;

    const items = raw["items"];
    if (Array.isArray(items)) return items;

    const results = raw["results"];
    if (Array.isArray(results)) return results;

    const artworks = raw["artworks"];
    if (Array.isArray(artworks)) return artworks;
  }

  return [];
}

export type FeedArtwork = {
  artworkId: number;
  title: string;
  image: string; // imgUrl / thumbnailUrl / savedImageName 등 원본값(렌더링 전에 resolve 필요할 수 있음)
  artistName?: string;
  artistId?: string; // memberUuid
};

function mapFeedRow(row: unknown): FeedArtwork | null {
  if (!isRecord(row)) return null;

  const artworkId =
    asNumber(row["artworkId"], NaN) ||
    asNumber(row["id"], NaN) ||
    asNumber(row["artwork_id"], NaN);

  if (!Number.isFinite(artworkId)) return null;

  const title =
    asString(row["title"], "") ||
    asString(row["artworkTitle"], "") ||
    asString(row["name"], "");

  // 이미지 후보 키들(서버 스펙에 맞춰 추가/삭제 가능)
  const image =
    asString(row["imgUrl"], "") ||
    asString(row["imageUrl"], "") ||
    asString(row["thumbnailUrl"], "") ||
    asString(row["savedImageName"], "") ||
    asString(row["saved_image_name"], "");

  // 이미지가 아예 없으면 그리드에서 제외(깨진 타일 방지)
  if (!image) return null;

  const artistName =
    asString(row["artistName"], "") ||
    asString(row["nickname"], "") ||
    asString(row["authorName"], "");

  const artistId =
    asString(row["memberUuid"], "") ||
    asString(row["artistId"], "") ||
    asString(row["artist_uuid"], "");

  return {
    artworkId,
    title,
    image,
    artistName: artistName || undefined,
    artistId: artistId || undefined,
  };
}

export async function fetchFeedArtworksOnly(): Promise<FeedArtwork[]> {
  const res = await http.get("/api/v1/artworks/feed");
  const raw = unwrapEnvelope<unknown>(unwrapAxios(res));
  const list = toArray(raw);

  // ✅ 작품만 필터링 + 중복 제거(artworkId 기준)
  const mapped = list
    .map(mapFeedRow)
    .filter((v): v is FeedArtwork => !!v);

  const seen = new Set<number>();
  const uniq: FeedArtwork[] = [];
  for (const a of mapped) {
    if (seen.has(a.artworkId)) continue;
    seen.add(a.artworkId);
    uniq.push(a);
  }
  return uniq;
}
