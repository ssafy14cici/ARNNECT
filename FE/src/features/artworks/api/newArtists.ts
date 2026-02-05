// FE/src/features/artworks/api/newArtists.ts
import { API_BASE_URL } from "../../../shared/config/env";

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string;
  savedImageName: string; // ex) "artworkxxxx.png" or "/artwork/xxx.png"
};

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(`[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`);
}

/**
 * ✅ 신진예술인 6명 조회
 * 명세에 따르면 PathParam memberUuid가 필수일 수 있음:
 * GET /api/v1/artwork/new/{memberUuid} (Auth=O)
 */
export async function fetchNewArtists(args: {
  accessToken: string;
  memberUuid: string; // ✅ 명세 반영
}): Promise<NewArtistArtwork[]> {
  const { accessToken, memberUuid } = args;

  if (!memberUuid?.trim()) {
    throw new Error("[newArtists] memberUuid가 비어있습니다. (명세: PathParam 필수)");
  }

  const isDev = !!import.meta.env.DEV;

  // ✅ DEV는 프록시 타게 상대경로, PROD는 API_BASE_URL 사용
  const base = isDev ? "" : (API_BASE_URL ? `${API_BASE_URL}` : "");

  // ✅ 명세 반영: /new/{memberUuid}
  const url = `${base}/api/v1/artwork/new/${encodeURIComponent(memberUuid)}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // 쿠키/세션 요구하는 서버도 있어서 안전하게 포함
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

  // 명세 예시가 배열이므로 배열 우선 처리
  if (Array.isArray(json)) return json as NewArtistArtwork[];

  // 혹시 {data: [...]} 봉투면 흡수
  const any = json as any;
  if (Array.isArray(any?.data)) return any.data as NewArtistArtwork[];
  if (Array.isArray(any?.data?.data)) return any.data.data as NewArtistArtwork[];

  return [];
}
