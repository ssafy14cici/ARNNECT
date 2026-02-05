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

function parseList(raw: unknown): NewArtistArtwork[] {
  // ✅ 서버가 배열로 주는 케이스(지금 네 스샷)
  if (Array.isArray(raw)) {
    return raw
      .map((it) => {
        if (!isRecord(it)) return null;

        const artworkId = asNumber(it.artworkId, NaN);
        const memberUuid = asString(it.memberUuid, "").trim();
        const nickname = asString(it.nickname, "").trim();
        const title = asString(it.title, "").trim();
        const description = asString(it.description, "").trim();
        const productionDate = asString(it.productionDate, "").trim();
        const savedImageName = asString(it.savedImageName, "").trim();

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

  // ✅ 혹시 envelope({data:[]}) 형태로 바뀌어도 깨지지 않게
  if (isRecord(raw)) {
    const data = (raw.data ?? raw.result ?? raw.items) as unknown;
    if (Array.isArray(data)) return parseList(data);
  }

  return [];
}

/**
 * ✅ savedImageName -> 실제 이미지 URL
 * - savedImageName: "artworkxxxx.jpg"
 * - 실제 접근: "/artwork/artworkxxxx.jpg"  (기존 imageUrl 패턴과 동일)
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

export async function fetchNewArtists(): Promise<NewArtistArtwork[]> {
  const res = await fetch(`/api/v1/artworks/new`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    // ✅ 쿠키 세션이면 켜도 됨 (같은 오리진이면 큰 차이 없음)
    // credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`fetchNewArtists failed: ${res.status}`);
  }

  const json = (await res.json()) as unknown;
  return parseList(json);
}
