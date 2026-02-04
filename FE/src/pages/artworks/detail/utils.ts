// FE/src/pages/artworks/detail/utils.ts
import { useAuthStore } from "../../../features/auth/store";

export type JsonObject = Record<string, unknown>;

export function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
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
export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : isObject(x) ? asString(get(x, "name"), "") : ""))
    .map((s) => s.trim())
    .filter(Boolean);
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
 * ✅ 이미지 URL 정규화 + /src 보정
 * - 절대 URL이면 그대로(단, pathname이 /artwork/* 면 /src/artwork/* 로 보정)
 * - 상대경로면 VITE_API_BASE_URL의 origin 붙임
 * - 상대경로가 /artwork/* 면 /src/artwork/* 로 보정
 */
export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  // 1) 절대 URL 처리
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      // 서버가 실제로 /src/artwork/* 에서 서빙하는 경우 보정
      if (url.pathname.startsWith("/artwork/")) {
        url.pathname = `/src${url.pathname}`;
      }
      return url.toString();
    } catch {
      return u0;
    }
  }

  // 2) 상대경로 처리
  let path = u0.startsWith("/") ? u0 : `/${u0}`;

  // ✅ 핵심 보정: /artwork/* → /src/artwork/*
  if (path.startsWith("/artwork/")) {
    path = `/src${path}`;
  }

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
