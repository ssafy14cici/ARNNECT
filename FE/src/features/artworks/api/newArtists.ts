// FE/src/features/artworks/api/newArtists.ts

export type NewArtistArtwork = {
  memberUuid: string;        // 예술인 uuid
  nickname: string;          // 활동명
  artworkId: number;         // 작품 id
  title: string;             // 작품명
  description?: string;      // 설명
  productionDate?: string;   // yyyy-MM-dd
  savedImageName: string;    // 이미지 저장명 또는 경로
};

function getApiBaseUrl(): string {
  const raw =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.VITE_API_BASE as string | undefined) ??
    (import.meta.env.VITE_SERVER_URL as string | undefined) ??
    "";
  return raw.replace(/\/+$/, "");
}

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  throw new Error(
    `[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`
  );
}

/**
 * 신진예술인 6명 조회
 * 명세: GET /api/v1/artwork/new (Auth=O)
 */
export async function fetchNewArtists(accessToken: string): Promise<NewArtistArtwork[]> {
  const base = getApiBaseUrl();

  // ✅ base가 없으면 같은 오리진으로 상대경로 호출 (config/api.ts 없이도 동작)
  const url = base ? `${base}/api/v1/artwork/new` : `/api/v1/artwork/new`;

  console.log("[newArtists] 🔍 API 요청:", url);
  console.log("[newArtists] 🔍 token:", accessToken ? `Bearer ${accessToken.slice(0, 12)}...` : "없음");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  console.log("[newArtists] 🔍 응답 status:", res.status, res.statusText);
  console.log("[newArtists] 🔍 body head:", text.slice(0, 200));

  ensureOk(res, text);

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : [];
  } catch {
    console.warn("[newArtists] ⚠️ JSON 파싱 실패");
    return [];
  }

  if (Array.isArray(json)) {
    console.log("[newArtists] ✅ 결과(배열):", (json as any[]).length, "건");
    return json as NewArtistArtwork[];
  }

  const any = json as any;
  if (Array.isArray(any?.data)) {
    console.log("[newArtists] ✅ 결과(data 배열):", any.data.length, "건");
    return any.data as NewArtistArtwork[];
  }
  if (Array.isArray(any?.data?.data)) {
    console.log("[newArtists] ✅ 결과(data.data 배열):", any.data.data.length, "건");
    return any.data.data as NewArtistArtwork[];
  }

  console.warn("[newArtists] ⚠️ 알 수 없는 응답 구조 → 빈 배열 반환");
  return [];
}

/**
 * savedImageName -> 실제 이미지 URL 만들기
 * - "/artwork/dd.png" (경로) 또는
 * - "artwork....jpg" (파일명) 모두 대응
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  if (!savedImageName) {
    console.warn("[newArtists] ⚠️ savedImageName 비어있음 → 빈 URL 반환");
    return "";
  }

  const base = getApiBaseUrl();

  // 이미 절대 URL이면 그대로
  if (/^https?:\/\//i.test(savedImageName)) return savedImageName;

  // "/artwork/xxx.png" 같이 경로가 오면 base만 붙이기 (base 없으면 그대로 상대경로)
  if (savedImageName.startsWith("/")) return base ? `${base}${savedImageName}` : savedImageName;

  // 파일명만 오면 /artwork/ 밑으로 가정 (base 없으면 상대경로)
  const tail = `/artwork/${encodeURIComponent(savedImageName)}`;
  return base ? `${base}${tail}` : tail;
}
