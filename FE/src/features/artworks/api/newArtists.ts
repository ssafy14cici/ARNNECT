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

/** 전시홀(작가별 작품 목록)용 최소 타입 */
export type ArtistArtwork = {
  artworkId: number;
  title: string;
  savedImageName: string;
  imageUrl?: string;
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
 * ✅ 작가별 작품 목록 파서
 * - /api/v1/artworks?artist=... 응답이 배열/엔벨로프 섞여도 견딤
 * - 필드명이 달라져도 최대한 흡수
 */
function parseArtistArtworks(raw: unknown): ArtistArtwork[] {
  const arr =
    Array.isArray(raw)
      ? raw
      : isRecord(raw)
      ? ((raw.data ?? raw.result ?? raw.items) as unknown)
      : null;

  if (!Array.isArray(arr)) return [];

  return arr
    .map((it) => {
      if (!isRecord(it)) return null;

      const artworkId = asNumber(pick(it, ["artworkId", "id", "artwork_id"]), NaN);
      if (!Number.isFinite(artworkId)) return null;

      const title = asString(pick(it, ["title", "artworkTitle", "name"]), "").trim();

      const savedImageName = asString(
        pick(it, ["savedImageName", "saved_image_name", "savedImage", "saved_image", "imageName"]),
        ""
      ).trim();

      const imageUrl = asString(
        pick(it, ["imageUrl", "imgUrl", "thumbnailUrl", "thumbnail", "url", "fileUrl", "file_url"]),
        ""
      ).trim();

      return {
        artworkId,
        title,
        savedImageName,
        imageUrl: imageUrl || undefined,
      } as ArtistArtwork;
    })
    .filter(Boolean) as ArtistArtwork[];
}

/**
 * ✅ media URL 정규화 (유저가 챙겨온 로직)
 */
export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const needsSrcPrefix = (p: string) => !p.startsWith("/src/") && p.startsWith("/artwork/");
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

/**
 * ✅ savedImageName or imageUrl -> 최종 이미지 URL
 * - raw가 파일명이면 "/artwork/<file>"로 만들고 resolveMediaUrl 적용
 * - raw가 "/artwork/..." 같은 경로면 resolveMediaUrl 적용
 * - raw가 절대 URL이면 DEV에서는 프록시 경로로 바꿔주도록 resolveMediaUrl 적용
 */
export function buildNewArtistImageUrl(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  if (/^https?:\/\//i.test(raw)) return resolveMediaUrl(raw);
  if (raw.startsWith("/")) return resolveMediaUrl(raw);

  return resolveMediaUrl(`/artwork/${encodeURIComponent(raw)}`);
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
  const base = isDev ? "" : API_BASE_URL ? `${API_BASE_URL}` : "";

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
    : [`/api/v1/artworks/new`, `/api/v1/artwork/new`];

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
 * ✅ 신진예술인 작품 목록 (/api/v1/artworks/new)
 */
export async function fetchNewArtists(memberUuid?: string): Promise<NewArtistArtwork[]> {
  const urls = buildCandidateUrls(memberUuid);
  const json = await fetchFirstOkJson(urls);
  return parseList(json);
}

/**
 * ✅ 작가별 작품 목록 (/api/v1/artworks?artist={memberUuid})
 */
export async function fetchArtworksByArtist(memberUuid: string): Promise<ArtistArtwork[]> {
  const uuid = String(memberUuid ?? "").trim();
  if (!uuid) return [];

  const isDev = import.meta.env.DEV;
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  const base = isDev ? "" : API_BASE_URL ? `${API_BASE_URL}` : "";

  const url = joinUrl(base, `/api/v1/artworks?artist=${encodeURIComponent(uuid)}`);

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`fetchArtworksByArtist failed: ${res.status}`);

  const json = (await res.json()) as unknown;
  return parseArtistArtworks(json);
}
