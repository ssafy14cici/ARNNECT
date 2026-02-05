// FE/src/features/artworks/api/newArtists.ts
import { API_BASE_URL } from "../../../shared/config/env";

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string;
  savedImageName: string; // ex) "artworkxxxx.png" or "/artwork/xxx.png" or absolute URL
};

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(
    `[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`
  );
}

/**
 * ✅ 신진예술인 6명 조회
 * - 명세에 memberUuid PathParam이 있을 수도 있어, 호출부에서 선택적으로 넘기게 처리함
 * - DEV에서는 Vite proxy(/api/v1 → target)를 타도록 "상대경로"로 호출
 * - PROD에서는 API_BASE_URL이 있으면 붙여서 호출
 *
 * 사용 예)
 *  - fetchNewArtists({ accessToken })                       // /api/v1/artwork/new
 *  - fetchNewArtists({ accessToken, memberUuid: "..." })    // /api/v1/artwork/new/{memberUuid}
 */
export async function fetchNewArtists(args: {
  accessToken: string;
  memberUuid?: string | null;
}): Promise<NewArtistArtwork[]> {
  const { accessToken, memberUuid } = args;

  const isDev = !!import.meta.env.DEV;

  // ✅ DEV: 프록시 타게 상대경로, PROD: API_BASE_URL(있으면) 사용
  const base = isDev ? "" : (API_BASE_URL ? `${API_BASE_URL}` : "");

  const suffix = memberUuid?.trim()
    ? `/api/v1/artwork/new/${encodeURIComponent(memberUuid.trim())}`
    : `/api/v1/artwork/new`;

  const url = `${base}${suffix}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // 서버가 쿠키/세션을 쓰는 경우 대비
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

  // 명세 예시가 배열 형태인 경우가 많음
  if (Array.isArray(json)) return json as NewArtistArtwork[];

  // 혹시 { data: [...] } 봉투 형태면 흡수
  const any = json as any;
  if (Array.isArray(any?.data)) return any.data as NewArtistArtwork[];
  if (Array.isArray(any?.data?.data)) return any.data.data as NewArtistArtwork[];

  return [];
}

/**
 * ✅ mainHallFree.ts에서 import하던 함수 (빌드 깨짐 방지용)
 *
 * savedImageName -> 화면에 사용할 URL(또는 DEV에선 프록시 경로)
 * - 절대 URL이면 그대로 반환
 * - "/artwork/..." 같은 경로면:
 *   - DEV: 그대로(프록시)
 *   - PROD: API_BASE_URL이 있으면 origin 붙임
 * - 파일명만 오면: "/artwork/{파일명}"으로 변환
 *
 * ⚠️ 주의:
 * - 이 URL을 <img src>에 바로 넣으면, "인증 필요한 이미지"인 경우 403이 날 수 있음
 * - 그 경우 팀장님 utils.ts의 fetchImageAsObjectUrl()로 blob 받아서 표시해야 함
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  const u0 = String(savedImageName ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const isDev = !!import.meta.env.DEV;

  // 1) 절대 URL이면 그대로
  if (/^https?:\/\//i.test(u0)) return u0;

  // 2) 경로 형태면 그대로 사용(필요 시 PROD에서는 base 붙임)
  if (u0.startsWith("/")) {
    if (isDev) return u0; // 프록시
    return API_BASE_URL ? `${API_BASE_URL}${u0}` : u0;
  }

  // 3) 파일명만 오면 /artwork/{name}
  const path = `/artwork/${encodeURIComponent(u0)}`;
  if (isDev) return path;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
