// FE/src/pages/artworks/detail/utils.ts
import { useAuthStore } from "../../../features/auth/store";

export type JsonObject = Record<string, unknown>;

/** ✅ 배열 제외한 "레코드 객체"만 true */
export function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}

export function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

export function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return fallback;
}

/**
 * ✅ tags 파싱 유틸 (절대 안 터지게)
 * - 배열: ["a", {name:"b"}, 1] → ["a","b","1"]
 * - 문자열: "#a #b", "a,b", "a b" → ["a","b"]
 * - 객체: {tags:[...]} / {items:[...]} / {content:[...]} 등 래핑도 흡수
 */
export function asStringArray(v: unknown): string[] {
  if (v == null) return [];

  // 1) 문자열 케이스
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s
      .replaceAll("#", " ")
      .split(/[,\s]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  // 2) 배열 케이스
  if (Array.isArray(v)) {
    return v
      .map((x) => {
        if (typeof x === "string") return x;
        if (typeof x === "number" || typeof x === "boolean") return String(x);

        // 객체 요소면 name/label/value/title 등 최대한 흡수
        if (isObject(x)) {
          const cand =
            asString(get(x, "name"), "").trim() ||
            asString(get(x, "label"), "").trim() ||
            asString(get(x, "value"), "").trim() ||
            asString(get(x, "title"), "").trim() ||
            asString(get(x, "tagName"), "").trim();

          return cand;
        }
        return "";
      })
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);
  }

  // 3) 객체 래핑 케이스: {tags:[...]} / {tagList:[...]} / {items:[...]} ...
  if (isObject(v)) {
    const inner =
      get(v, "tags") ??
      get(v, "tagList") ??
      get(v, "items") ??
      get(v, "content") ??
      get(v, "list");

    return asStringArray(inner);
  }

  return [];
}

/** 공통 응답 봉투 { data: ... } 흡수 */
export function pickEnvelopeData(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

export function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

export function safeToInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * ✅ 이미지 URL 정규화 + /src 보정 (artwork + review 공통)
 *
 * - 절대 URL이면:
 *   - pathname이 /artwork/* 또는 /review/* 면 /src/* 로 보정
 *   - DEV(import.meta.env.DEV)에서는 "상대경로(/src/...)"로 바꿔서 Vite proxy를 타게 함
 *
 * - 상대경로면:
 *   - /artwork/* 또는 /review/* 면 /src/* 로 보정
 *   - DEV에서는 상대경로 그대로 반환(프록시)
 *   - PROD에서는 VITE_API_BASE_URL의 origin을 붙여 반환
 */
export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;
  const needsSrcPrefix = (p: string) =>
    !p.startsWith("/src/") && (p.startsWith("/artwork/") || p.startsWith("/review/"));
  const isDev = !!import.meta.env.DEV;
  // 1) 절대 URL 처리
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      if (needsSrcPrefix(url.pathname)) {
        url.pathname = `/src${url.pathname}`;
      }
      // ✅ DEV에서는 절대 URL을 상대경로로 바꿔서 프록시 타게
      if (isDev) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return u0;
    }
  }
  // 2) 상대 경로 처리
  let path = u0.startsWith("/") ? u0 : `/${u0}`;
  if (needsSrcPrefix(path)) {
    path = `/src${path}`;
  }
  // ✅ DEV: 프록시
  if (isDev) return path;
  // ✅ PROD: VITE_API_BASE_URL origin 붙이기
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }
  return origin ? `${origin}${path}` : path;
}


/** store 구조가 token/accessToken 둘 다 가능 */
type AuthStateLike = { token?: string | null; accessToken?: string | null };
export function getAccessTokenFromStore(): string | null {
  const s = useAuthStore.getState() as unknown as AuthStateLike;
  return (s.token ?? s.accessToken ?? null) || null;
}

/**
 * <img>는 Authorization 헤더를 못 붙이므로,
 * 인증 필요한 이미지면 fetch로 blob 받아 objectURL로 표시
 */
export async function fetchImageAsObjectUrl(imageUrl: string): Promise<string | null> {
  const url = resolveMediaUrl(imageUrl);
  if (!url) return null;

  const token = getAccessTokenFromStore();

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
