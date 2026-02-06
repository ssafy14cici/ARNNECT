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

/** 전시홀(작가별 작품 리스트)용: 서버 응답이 조금 달라도 흡수할 타입 */
export type ArtistArtwork = {
  artworkId: number;
  title: string;
  savedImageName: string;
  imageUrl?: string; // 서버가 imageUrl/thumbnailUrl 등을 줄 수도 있어서
  description?: string;
  productionDate?: string;
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

/** envelope({data:[]}) / {result:[]} / {items:[]} / {content:[]} 등 흔한 케이스 unwrap */
function unwrapList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;

  if (isRecord(raw)) {
    const candidates = [
      raw.data,
      raw.result,
      raw.items,
      raw.content,
      raw.list,
      raw.artworks,
    ] as unknown[];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      // page 형태 { content: [] }
      if (isRecord(c) && Array.isArray((c as any).content)) return (c as any).content as unknown[];
    }
  }

  return null;
}

function parseNewArtists(raw: unknown): NewArtistArtwork[] {
  const list = unwrapList(raw);
  if (!list) return [];

  return list
    .map((it) => {
      if (!isRecord(it)) return null;

      const artworkId = asNumber(pick(it, ["artworkId", "artwork_id", "id"]), NaN);
      const memberUuid = asString(
        pick(it, ["memberUuid", "member_uuid", "artistId", "artist_id"]),
        ""
      ).trim();
      const nickname = asString(pick(it, ["nickname", "artistNickname", "artist_nickname"]), "").trim();
      const title = asString(pick(it, ["title", "artworkTitle", "artwork_title"]), "").trim();
      const description = asString(pick(it, ["description", "desc"]), "").trim();
      const productionDate = asString(
        pick(it, ["productionDate", "production_date", "createdAt", "created_at"]),
        ""
      ).trim();

      const savedImageName = asString(
        pick(it, ["savedImageName", "saved_image_name", "savedImage", "saved_image", "imageName", "image_name"]),
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

function parseArtistArtworks(raw: unknown): ArtistArtwork[] {
  const list = unwrapList(raw);
  if (!list) return [];

  return list
    .map((it) => {
      if (!isRecord(it)) return null;

      const artworkId = asNumber(pick(it, ["artworkId", "artwork_id", "id"]), NaN);
      const title = asString(pick(it, ["title", "artworkTitle", "artwork_title"]), "").trim();

      // 서버가 둘 중 하나(혹은 둘 다)를 줄 수 있음
      const savedImageName = asString(
        pick(it, ["savedImageName", "saved_image_name", "savedImage", "saved_image", "imageName", "image_name"]),
        ""
      ).trim();

      const imageUrl = asString(
        pick(it, ["imageUrl", "imgUrl", "thumbnailUrl", "thumbUrl", "savedImageUrl"]),
        ""
      ).trim();

      const description = asString(pick(it, ["description", "desc"]), "").trim();
      const productionDate = asString(
        pick(it, ["productionDate", "production_date", "createdAt", "created_at"]),
        ""
      ).trim();

      if (!Number.isFinite(artworkId)) return null;

      return {
        artworkId,
        title,
        savedImageName,
        imageUrl: imageUrl || undefined,
        description: description || undefined,
        productionDate: productionDate || undefined,
      } as ArtistArtwork;
    })
    .filter(Boolean) as ArtistArtwork[];
}

/** baseURL + path 결합 (base가 없으면 path 그대로) */
function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (base.endsWith("/") && path.startsWith("/")) return base.slice(0, -1) + path;
  if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
  return base + path;
}

/** prod에선 VITE_API_BASE_URL을 붙이고, dev에선 프록시를 타도록 base="" */
function getFetchBase(): string {
  const isDev = !!import.meta.env.DEV;
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  return isDev ? "" : API_BASE_URL ? `${API_BASE_URL}` : "";
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    // credentials: "include", // 필요하면 켜기
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return (await res.json()) as unknown;
}

/**
 * ✅ 신진예술인(메인홀 대표작 6장)
 * - 현재 서버 고정: /api/v1/artworks/new
 * - 혹시 경로가 흔들릴 수 있어서 후보 몇 개 유지
 */
export async function fetchNewArtists(): Promise<NewArtistArtwork[]> {
  const base = getFetchBase();

  const candidates = ["/api/v1/artworks/new", "/api/v1/artwork/new"].map((p) => joinUrl(base, p));

  let lastErr: unknown = null;

  for (const url of candidates) {
    try {
      const raw = await fetchJson(url);
      return parseNewArtists(raw);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("fetchNewArtists failed");
}

/**
 * ✅ 작가 전시홀 작품 목록
 * - 서버: /api/v1/artworks?artist={memberUuid}
 */
export async function fetchArtworksByArtist(memberUuid: string): Promise<ArtistArtwork[]> {
  const base = getFetchBase();
  const uuid = String(memberUuid ?? "").trim();
  if (!uuid) return [];

  const qs = `artist=${encodeURIComponent(uuid)}`;

  const candidates = [`/api/v1/artworks?${qs}`, `/api/v1/artwork?${qs}`].map((p) => joinUrl(base, p));

  let lastErr: unknown = null;

  for (const url of candidates) {
    try {
      const raw = await fetchJson(url);
      return parseArtistArtworks(raw);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("fetchArtworksByArtist failed");
}

/**
 * ✅ (중요) artworkId로 "바로" 이미지 URL 만들기
 *
 * 백엔드가 아래 같은 엔드포인트를 제공한다는 전제가 필요함:
 *   - /api/v1/artworks/{artworkId}/image   (추천)
 *
 * 만약 실제 경로가 다르면 "여기 path 한 줄"만 바꿔서 맞추면 됨.
 */
export function buildArtworkImageUrlById(artworkId: string | number): string {
  const id = String(artworkId ?? "").trim();
  if (!id) return "";

  // ✅ 여기만 백엔드 실제 라우트에 맞게 조정
  const path = `/api/v1/artworks/${encodeURIComponent(id)}/image`;

  return resolveApiUrl(path);
}

/**
 * ✅ 이미지 경로 만들어주기 (savedImageName or /artwork/... or absolute URL 모두 흡수)
 * - 최종 반환은 resolveMediaUrl을 태워서 “디테일에서 잘 되던 규칙” 그대로 적용
 */
export function buildNewArtistImageUrl(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // 이미 완성된 URL/경로면 resolveMediaUrl로만 정리
  if (/^https?:\/\//i.test(raw)) return resolveMediaUrl(raw);
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  // "/artwork/xxx.jpg" 같이 온 경우
  if (raw.startsWith("/")) return resolveMediaUrl(raw);

  // savedImageName만 온 경우 → "/artwork/..."
  return resolveMediaUrl(`/artwork/${encodeURIComponent(raw)}`);
}

/** API 경로를 dev(프록시)/prod(origin 부착) 규칙으로 정규화 */
function resolveApiUrl(input: string): string {
  const u0 = String(input ?? "").trim();
  if (!u0) return "";

  // 절대 URL이면 그대로
  if (/^https?:\/\//i.test(u0)) return u0;

  const isDev = !!import.meta.env.DEV;
  const path = u0.startsWith("/") ? u0 : `/${u0}`;

  if (isDev) return path;

  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  try {
    if (!apiBase) return path;
    const origin = new URL(apiBase).origin;
    return `${origin}${path}`;
  } catch {
    return path;
  }
}

/** (유저가 챙겨온) 디테일에서 잘 먹히는 이미지 URL 정규화 */
export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const needsSrcPrefix = (p: string) => !p.startsWith("/src/") && p.startsWith("/artwork/");
  const isDev = !!import.meta.env.DEV;

  // 1) 절대 URL
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      if (needsSrcPrefix(url.pathname)) {
        url.pathname = `/src${url.pathname}`;
      }
      // DEV: 절대 URL을 상대경로로 바꿔서 프록시 타게
      if (isDev) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return u0;
    }
  }

  // 2) 상대 경로
  let path = u0.startsWith("/") ? u0 : `/${u0}`;
  if (needsSrcPrefix(path)) {
    path = `/src${path}`;
  }

  // DEV: 프록시
  if (isDev) return path;

  // PROD: VITE_API_BASE_URL origin 붙이기
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }
  return origin ? `${origin}${path}` : path;
}
