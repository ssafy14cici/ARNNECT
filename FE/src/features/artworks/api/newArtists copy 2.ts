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
  // 프로젝트에서 쓰는 env 키가 무엇이든 대응(우선순위만 잡아둠)
  const raw =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.VITE_API_BASE as string | undefined) ??
    (import.meta.env.VITE_SERVER_URL as string | undefined) ??
    "";

  return raw.replace(/\/+$/, ""); // trailing slash 제거
}

function ensureOk(res: Response, bodyText: string) {
  if (res.ok) return;
  // 응답이 JSON일 수도 있고, 문자열일 수도 있으니 최소한으로 에러 메시지 구성
  throw new Error(`[newArtists] HTTP ${res.status} ${res.statusText} - ${bodyText.slice(0, 300)}`);
}

/**
 * 신진예술인 6명 조회
 * 명세: GET /api/v1/artwork/new (Auth=O) :contentReference[oaicite:1]{index=1}
 */
export async function fetchNewArtists(accessToken: string): Promise<NewArtistArtwork[]> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("[newArtists] VITE_API_BASE_URL (or equivalent) is not set.");

  const url = `${base}/api/v1/artwork/new`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  ensureOk(res, text);

  // 명세 예시는 “배열 자체”로 내려옴 :contentReference[oaicite:2]{index=2}
  // 하지만 혹시 envelope로 감싸졌을 가능성도 있어서 유연하게 파싱
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : [];
  } catch {
    // JSON이 아닌 경우 방어
    return [];
  }

  if (Array.isArray(json)) return json as NewArtistArtwork[];

  // { data: [...] } 형태 대응
  const any = json as any;
  if (Array.isArray(any?.data)) return any.data as NewArtistArtwork[];
  if (Array.isArray(any?.data?.data)) return any.data.data as NewArtistArtwork[];

  return [];
}

/**
 * savedImageName -> 실제 이미지 URL 만들기
 * 명세에 "/artwork/dd.png" 같은 경로 예시도 있고 :contentReference[oaicite:3]{index=3}
 * 샘플은 "artwork...png" 같은 파일명만 오기도 함 :contentReference[oaicite:4]{index=4}
 */
export function buildNewArtistImageUrl(savedImageName: string): string {
  const base = getApiBaseUrl();
  if (!savedImageName) return "";

  // 이미 절대 URL이면 그대로
  if (/^https?:\/\//i.test(savedImageName)) return savedImageName;

  // "/artwork/xxx.png" 같이 경로가 오면 base만 붙이기
  if (savedImageName.startsWith("/")) return `${base}${savedImageName}`;

  // 파일명만 오면 /artwork/ 밑으로 가정
  return `${base}/artwork/${encodeURIComponent(savedImageName)}`;
}
