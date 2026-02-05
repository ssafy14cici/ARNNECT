// FE/src/features/artworks/api/newArtists.ts
import { API_BASE_URL } from "../../../shared/config/env";

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string; // yyyy-MM-dd
  savedImageName: string;  // "/artwork/dd.png" or "artwork....jpg"
};

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(`[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`);
}

/**
 * 신진예술인 6명 조회
 * GET /api/v1/artwork/new (Auth=O)
 */
export async function fetchNewArtists(accessToken: string): Promise<NewArtistArtwork[]> {
  // ✅ API_BASE_URL 없으면 같은 오리진 상대경로로 호출
  const url = API_BASE_URL ? `${API_BASE_URL}/api/v1/artwork/new` : `/api/v1/artwork/new`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
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
 * - "/artwork/dd.png" (경로) 또는
 * - "artwork ...jpg" (파일명) 모두 대응
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  if (!savedImageName) return "";

  // 절대 URL이면 그대로
  if (/^https?:\/\//i.test(savedImageName)) return savedImageName;

  // "/artwork/xxx.png" 같이 경로면 base만 붙이기 (base 없으면 상대경로 그대로)
  if (savedImageName.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${savedImageName}` : savedImageName;

  // 파일명만 오면 /artwork/ 밑으로 가정
  const tail = `/artwork/${encodeURIComponent(savedImageName)}`;
  return API_BASE_URL ? `${API_BASE_URL}${tail}` : tail;
}
