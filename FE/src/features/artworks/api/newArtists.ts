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
 * ✅ 신진예술인 6명 조회 (PUBLIC)
 * - 이 엔드포인트는 "공개" 전제로: Authorization/쿠키 없이 호출
 * - DEV에서는 Vite proxy(/api/v1 → target)를 타도록 "상대경로"로 호출
 * - PROD에서는 API_BASE_URL이 있으면 붙여서 호출
 *
 * 사용 예)
 *  - fetchNewArtists()                               // /api/v1/artwork/new
 *  - fetchNewArtists({ memberUuid: "..." })          // /api/v1/artwork/new/{memberUuid}
 */
export async function fetchNewArtists(args?: {
  memberUuid?: string | null;
}): Promise<NewArtistArtwork[]> {
  const memberUuid = args?.memberUuid?.trim() ?? "";

  const isDev = !!import.meta.env.DEV;

  // ✅ DEV: 프록시 타게 상대경로, PROD: API_BASE_URL(있으면) 사용
  const base = isDev ? "" : (API_BASE_URL ? `${API_BASE_URL}` : "");

  const suffix = memberUuid
    ? `/api/v1/artworks/new/${encodeURIComponent(memberUuid)}`
    : `/api/v1/artworks/new`;

  const url = `${base}${suffix}`;

  const res = await fetch(url, {
    method: "GET",
    // ✅ 공개 페이지: 쿠키/세션도 안 씀(크로스도메인 이슈 최소화)
    credentials: "omit",
    headers: {
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
 * - 지금 BE 쿼리에서 saved_image_name을 concat('artwork', a.saved_image_name) 형태로 내려줌
 *   예) "artwork빛나는 순간_2.jpg", "artwork0165....png"
 *   이런 경우 "/artwork/{파일명}"로 만들면 "/artwork/artwork빛나는 순간_2.jpg"가 됨.
 * - 따라서 아래는 "artwork" prefix를 한 번 정규화해서 제거/보정해줌.
 * - 그래도 403이면, 정적 리소스(/artwork/**)가 Security permitAll에 안 열려있을 가능성이 큼.
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  let u0 = String(savedImageName ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const isDev = !!import.meta.env.DEV;

  // 0) 절대 URL이면 그대로
  if (/^https?:\/\//i.test(u0)) return u0;

  // 0-1) BE가 "artwork{파일명}" 형태로 내려주는 케이스 정규화
  // - "artwork/xxx.png" (슬래시 포함)
  // - "artworkxxx.png"  (슬래시 없음)
  // - 대소문자 혼재 방어
  const lower = u0.toLowerCase();
  if (lower.startsWith("artwork/")) u0 = u0.slice("artwork/".length);
  else if (lower.startsWith("artwork")) u0 = u0.slice("artwork".length);

  u0 = u0.trim();

  // 1) 경로 형태면 그대로 사용(필요 시 PROD에서는 base 붙임)
  //    (정규화 후에도 "/artwork/..." 같은 값이면 이 분기 타게 됨)
  if (u0.startsWith("/")) {
    if (isDev) return u0; // 프록시
    return API_BASE_URL ? `${API_BASE_URL}${u0}` : u0;
  }

  // 2) 파일명만 오면 /artwork/{name}
  //    (한글/공백/특수문자 있을 수 있어 encodeURIComponent)
  const path = `/artwork/${encodeURIComponent(u0)}`;
  if (isDev) return path;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
