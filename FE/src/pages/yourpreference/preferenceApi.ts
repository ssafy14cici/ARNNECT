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
  return isRecord(res) && "data" in res ? (res as any).data : res;
}
function unwrapEnvelope(raw: unknown): unknown {
  // { success, data, ... } 형태도 흡수
  if (isRecord(raw) && "data" in raw && ("success" in raw || "code" in raw)) {
    return (raw as any).data;
  }
  return raw;
}

// ------------------------
// GET /api/v1/preference
// ------------------------
export type PreferenceArtwork = {
  artworkId: number;
  imageUrl: string;   // 파일명 or 경로
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

  // ✅ 파일명만 오면 /artwork/ prefix 붙임 (resolveMediaUrl 전제)
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

  // ✅ 각 genre 당 artworks 2개를 라운드로 구성
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

export async function postPreference(
  body: PreferenceRequest,
  opts?: { skipAuth?: boolean },
): Promise<string> {
  const res = await http.post("/api/v1/preference", body, {
    headers: opts?.skipAuth ? ({ "x-skip-auth": "1" } as any) : undefined,
  });

  const raw0 = unwrapAxios(res);
  const raw = unwrapEnvelope(raw0);

  if (!isRecord(raw)) return "";
  return asString(raw["MBTI_name"], "").trim().toUpperCase();
}
