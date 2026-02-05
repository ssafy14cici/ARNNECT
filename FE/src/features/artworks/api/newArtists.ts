// FE/src/features/artworks/api/newArtists.ts
import { API_BASE_URL } from "../../../config/api";

export type NewArtistArtwork = {
  memberUuid: string;
  nickname: string;
  artworkId: number;
  title: string;
  description?: string;
  productionDate?: string;
  savedImageName: string; // "/artwork/dd.png" 또는 파일명일 수도 있음
};

type Wrapped<T> = { code: string; message: string; data?: T };

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isWrapped<T>(x: unknown): x is Wrapped<T> {
  return isObject(x) && typeof (x as any).code === "string" && typeof (x as any).message === "string";
}

function joinUrl(base: string, path: string) {
  const b = (base ?? "").replace(/\/+$/, "");
  const p = (path ?? "").startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export function buildNewArtistImageUrl(savedImageName: string, baseUrl: string = API_BASE_URL) {
  const s = (savedImageName ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return joinUrl(baseUrl, s);
  return joinUrl(baseUrl, `/artwork/${encodeURIComponent(s)}`);
}

export async function fetchNewArtists(accessToken: string, baseUrl: string = API_BASE_URL): Promise<NewArtistArtwork[]> {
  const url = joinUrl(baseUrl, "/api/v1/artwork/new");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`fetchNewArtists failed: HTTP ${res.status}\n${txt}`);
  }

  const json = (await res.json()) as unknown;

  // 배열 직접 or 공통 wrapper(data) 둘 다 허용
  if (Array.isArray(json)) return json as NewArtistArtwork[];
  if (isWrapped<NewArtistArtwork[]>(json) && Array.isArray(json.data)) return json.data;

  return [];
}
