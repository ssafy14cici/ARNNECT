// FE/src/shared/utils/resolveMediaUrl.ts
import { API_BASE_URL } from "../config/env";

export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const isDev = !!import.meta.env.DEV;

  // ✅ /ticket, /qrcode만 /src prefix 대상 (review는 절대 제외)
  const needsSrcPrefix = (p: string) =>
    !p.startsWith("/src/") && (p.startsWith("/qrcode/") || p.startsWith("/ticket/"));

  // 1) 절대 URL 처리
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      if (needsSrcPrefix(url.pathname)) url.pathname = `/src${url.pathname}`;
      if (isDev) return `${url.pathname}${url.search}${url.hash}`; // DEV 프록시 정책 유지
      return url.toString();
    } catch {
      return u0;
    }
  }

  // 2) 상대 경로 처리
  let path = u0.startsWith("/") ? u0 : `/${u0}`;
  if (needsSrcPrefix(path)) path = `/src${path}`;

  // DEV: 프록시
  if (isDev) return path;

  // PROD: API_BASE_URL의 origin 붙이기
  let origin = "";
  try {
    if (API_BASE_URL) origin = new URL(API_BASE_URL).origin;
  } catch {
    origin = "";
  }

  return origin ? `${origin}${path}` : path;
}
