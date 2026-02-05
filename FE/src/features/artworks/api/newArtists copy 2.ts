// FE/src/features/artworks/api/newArtists.ts
import { API_BASE_URL } from "@/shared/config/env";

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string;
  savedImageName: string;
};

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(
    `[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`
  );
}

/**
 * 신진예술인 6명 조회
 * GET /api/v1/artwork/new (Auth=O)
 */
export async function fetchNewArtists(accessToken: string): Promise<NewArtistArtwork[]> {
  // ✅ base가 비어있으면 같은 오리진 상대경로로 호출
  const url = (API_BASE_URL ? `${API_BASE_URL}` : "") + "/api/v1/artwork/new";

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
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  if (!savedImageName) return "";

  if (/^https?:\/\//i.test(savedImageName)) return savedImageName;

  if (savedImageName.startsWith("/")) {
    // "/artwork/xxx.png"
    return API_BASE_URL ? `${API_BASE_URL}${savedImageName}` : savedImageName;
  }

  // "xxx.png" -> "/artwork/xxx.png"
  const tail = `/artwork/${encodeURIComponent(savedImageName)}`;
  return API_BASE_URL ? `${API_BASE_URL}${tail}` : tail;
}
