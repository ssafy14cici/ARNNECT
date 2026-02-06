// FE/src/features/artworks/api/newArtists.ts

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description: string;
  productionDate: string;
  savedImageName: string;
};

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

/** 여러 키 후보 중 첫 번째로 존재하는 값을 반환 */
function pick(obj: JsonRecord, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function parseList(raw: unknown): NewArtistArtwork[] {
  // ✅ 서버가 배열로 주는 케이스
  if (Array.isArray(raw)) {
    return raw
      .map((it) => {
        if (!isRecord(it)) return null;

        const artworkId = asNumber(pick(it, ["artworkId", "artwork_id"]), NaN);
        const memberUuid = asString(pick(it, ["memberUuid", "member_uuid"]), "").trim();
        const nickname = asString(pick(it, ["nickname"]), "").trim();
        const title = asString(pick(it, ["title"]), "").trim();
        const description = asString(pick(it, ["description"]), "").trim();
        const productionDate = asString(pick(it, ["productionDate", "production_date"]), "").trim();

        // savedImageName 키가 흔히 바뀌는 지점이라 후보 여러개 대응
        const savedImageName = asString(
          pick(it, ["savedImageName", "saved_image_name", "savedImage", "saved_image"]),
          ""
        ).trim();

        if (!Number.isFinite(artworkId)) return null;
        if (!memberUuid) return null;

        return {
          artworkId,
          memberUuid,
          nickname,
          title,
          description,
          productionDate,
          savedImageName,
        } as NewArtistArtwork;
      })
      .filter(Boolean) as NewArtistArtwork[];
  }

  // ✅ envelope({data:[]}) / {result:[]} / {items:[]} 형태도 대응
  if (isRecord(raw)) {
    const data = (raw.data ?? raw.result ?? raw.items) as unknown;
    if (Array.isArray(data)) return parseList(data);
  }

  return [];
}

/**
 * ✅ savedImageName -> 실제 이미지 URL
 * - savedImageName: "artworkxxxx.jpg"
 * - 실제 접근: "/artwork/artworkxxxx.jpg" (기존 imageUrl 패턴과 동일)
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  const raw = String(savedImageName ?? "").trim();
  if (!raw) return "";

  // 이미 완성된 URL/경로면 그대로
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return raw;

  return `/artwork/${encodeURIComponent(raw)}`;
}

/** baseURL + path 결합 (base가 없으면 path 그대로) */
function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (base.endsWith("/") && path.startsWith("/")) return base.slice(0, -1) + path;
  if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
  return base + path;
}

/** ✅ 4가지 경로 후보를 모두 만들어서 순서대로 시도 */
function buildCandidateUrls(memberUuid?: string | null): string[] {
  const isDev = import.meta.env.DEV;
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

  // dev에선 보통 Vite proxy를 쓰니까 base="" 유지,
  // prod에서 프론트/백 분리면 VITE_API_BASE_URL을 붙임
  const base = isDev ? "" : (API_BASE_URL ? `${API_BASE_URL}` : "");

  const uuid = String(memberUuid ?? "").trim();
  const hasUuid = !!uuid;

  const uuidPart = hasUuid ? `/${encodeURIComponent(uuid)}` : "";

  // ✅ 선호 순서: plural 먼저 → singular
  const paths = hasUuid
    ? [
        `/api/v1/artworks/new${uuidPart}`,
        `/api/v1/artwork/new${uuidPart}`,
        `/api/v1/artworks/new`,
        `/api/v1/artwork/new`,
      ]
    : [
        `/api/v1/artworks/new`,
        `/api/v1/artwork/new`,
      ];

  return paths.map((p) => joinUrl(base, p));
}

async function fetchFirstOkJson(urls: string[]): Promise<unknown> {
  const tried: Array<{ url: string; status?: number; error?: string }> = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        // credentials: "include", // 쿠키 세션이면 필요시 활성화
      });

      if (!res.ok) {
        tried.push({ url, status: res.status });
        continue;
      }

      return (await res.json()) as unknown;
    } catch (e) {
      tried.push({ url, error: e instanceof Error ? e.message : String(e) });
      continue;
    }
  }

  const detail = tried
    .map((t) => `${t.url} -> ${t.status ?? "ERR"}${t.error ? ` (${t.error})` : ""}`)
    .join(" | ");

  throw new Error(`fetchNewArtists: all candidates failed. ${detail}`);
}

/**
 * ✅ 신진예술인 작품 목록
 * - memberUuid가 있으면 4가지 경로 후보를 모두 시도
 * - memberUuid가 없으면 2가지(/artworks/new, /artwork/new)만 시도
 */
export async function fetchNewArtists(memberUuid?: string): Promise<NewArtistArtwork[]> {
  const urls = buildCandidateUrls(memberUuid);
  const json = await fetchFirstOkJson(urls);
  return parseList(json);
}
