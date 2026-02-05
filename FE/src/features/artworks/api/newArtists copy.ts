// FE/src/features/artworks/api/newArtists.ts

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string; // yyyy-MM-dd
  savedImageName: string;  // "/artwork/dd.png" or "artwork....png" (명세)
};

function getApiBaseUrl(): string {
  const raw =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.VITE_API_BASE as string | undefined) ??
    (import.meta.env.VITE_SERVER_URL as string | undefined) ??
    "";

  return String(raw || "").replace(/\/+$/, "");
}

// ✅ base가 없으면 same-origin 상대경로로 호출
function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(`[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`);
}

/**
 * GET /api/v1/artwork/new (Auth=O)
 * 응답: 배열
 */
export async function fetchNewArtists(accessToken: string): Promise<NewArtistArtwork[]> {
  const url = apiUrl("/api/v1/artwork/new");

  // 디버깅용: 네트워크에 안 찍힐 때 “호출 시도” 자체를 확인
  if (import.meta.env.DEV) console.log("[newArtists] GET", url, "hasToken=", Boolean(accessToken));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  ensureOk(res, text);

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : [];
  } catch {
    return [];
  }

  if (Array.isArray(json)) return json as NewArtistArtwork[];

  const any = json as any;
  if (Array.isArray(any?.data)) return any.data as NewArtistArtwork[];
  if (Array.isArray(any?.data?.data)) return any.data.data as NewArtistArtwork[];

  return [];
}

/**
 * savedImageName -> 실제 이미지 URL
 * - "/artwork/dd.png" => "/artwork/dd.png" (same-origin) 또는 "BASE/artwork/dd.png"
 * - "artwork....png"  => "/artwork/<encoded>"
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  if (!savedImageName) return "";

  if (/^https?:\/\//i.test(savedImageName)) return savedImageName;

  if (savedImageName.startsWith("/")) return apiUrl(savedImageName);

  return apiUrl(`/artwork/${encodeURIComponent(savedImageName)}`);
}
