// FE/src/pages/yourpreference/preferenceApi.ts
import { http } from "../../shared/api/http";

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
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x, "")).filter(Boolean);
}

function unwrapAxios(res: unknown): unknown {
  // axios response { data: ... } → data만 추출
  return isRecord(res) && "data" in res ? (res as any).data : res;
}

/**
 * ✅ 엔벨로프(래핑) 응답을 최대한 관대하게 풀기
 * - 백엔드가 { data }, { result }, { response } 등으로 감싸도 처리
 * - 기존처럼 success/code 같은 키 존재 여부에 의존하지 않음
 */
function unwrapEnvelope(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  if ("data" in raw) return (raw as any).data;
  if ("result" in raw) return (raw as any).result;
  if ("response" in raw) return (raw as any).response;

  return raw;
}

function normalizeMbtiCode(v: unknown): string {
  return asString(v, "").trim().toUpperCase();
}

// ------------------------
// GET /api/v1/preference
// ------------------------
export type PreferenceArtwork = {
  artworkId: number;
  imageUrl: string; // 파일명 or 경로
  tags: string[];
};

export type PreferenceGenreGroup = {
  genreId: number;
  genreName: string;
  artworks: PreferenceArtwork[];
};

export type PreferenceRound = {
  round: number;
  genreId: number;
  genreName: string;
  left: PreferenceArtwork;
  right: PreferenceArtwork;
};

function normalizeImagePath(imageUrl: string): string {
  const u = String(imageUrl ?? "").trim();
  if (!u) return "";

  // 이미 절대/상대경로로 오면 그대로
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;

  // 파일명만 오면 prefix
  return `/artwork/${u}`;
}

function parseGenreGroups(raw: unknown): PreferenceGenreGroup[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((g): PreferenceGenreGroup | null => {
      if (!isRecord(g)) return null;

      const genreId = asNumber(g["genreId"], NaN);
      const genreName = asString(g["genreName"], "");
      const artworksRaw = g["artworks"];

      if (!Number.isFinite(genreId) || !genreName || !Array.isArray(artworksRaw)) return null;

      const artworks: PreferenceArtwork[] = artworksRaw
        .map((a): PreferenceArtwork | null => {
          if (!isRecord(a)) return null;

          const artworkId = asNumber(a["artworkId"], NaN);
          const imageUrl = normalizeImagePath(asString(a["imageUrl"], ""));
          const tags = asStringArray(a["tags"]);

          if (!Number.isFinite(artworkId) || !imageUrl) return null;
          return { artworkId, imageUrl, tags };
        })
        .filter(Boolean) as PreferenceArtwork[];

      return { genreId, genreName, artworks };
    })
    .filter(Boolean) as PreferenceGenreGroup[];
}

export async function getPreferenceRounds(opts?: { skipAuth?: boolean }): Promise<PreferenceRound[]> {
  const res = await http.get("/api/v1/preference", {
    headers: opts?.skipAuth ? ({ "x-skip-auth": "1" } as any) : undefined,
  });

  const raw0 = unwrapAxios(res);
  const raw = unwrapEnvelope(raw0);

  const groups = parseGenreGroups(raw);

  // 각 genre 당 artworks 2개를 라운드로 구성
  const rounds: PreferenceRound[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.artworks.length < 2) continue;

    rounds.push({
      round: rounds.length + 1,
      genreId: g.genreId,
      genreName: g.genreName,
      left: g.artworks[0],
      right: g.artworks[1],
    });
  }

  return rounds;
}

// ------------------------
// POST /api/v1/preference
// ------------------------
export type PreferenceRequest = {
  artworkIdList: number[];
};

/**
 * ✅ 백엔드가 ResultMBTIResponse { String type; } 형태로 주는 경우:
 *   { "type": "ANLS" }
 * - 혹시 다른 브랜치/이전 키도 같이 호환(MBTI_name, mbti, mbtiCode 등)
 */
export async function postPreference(
  body: PreferenceRequest,
  opts?: { skipAuth?: boolean },
): Promise<string> {
  const res = await http.post("/api/v1/preference", body, {
    headers: opts?.skipAuth ? ({ "x-skip-auth": "1" } as any) : undefined,
  });

  const raw0 = unwrapAxios(res);
  const raw = unwrapEnvelope(raw0);

  // 서버가 그냥 문자열로 내려주는 특이 케이스 방어
  if (typeof raw === "string") return normalizeMbtiCode(raw);

  if (!isRecord(raw)) return "";

  const code =
    // ✅ 현재 백엔드 스펙
    raw["type"] ??
    // ✅ 혹시 예전/다른 응답 키 호환
    raw["MBTI_name"] ??
    raw["mbti"] ??
    raw["mbtiCode"] ??
    raw["MBTI"];

  return normalizeMbtiCode(code);
}
