// FE/src/features/profile/resolveProfileMedia.ts
export function resolveProfileMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const needsSrcPrefix = (p: string) => !p.startsWith("/src/") && p.startsWith("/profile/");
  const isDev = !!import.meta.env.DEV;

  // 1) 절대 URL 처리
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      if (needsSrcPrefix(url.pathname)) url.pathname = `/src${url.pathname}`;

      // DEV: 절대 URL을 상대경로로 바꿔서 프록시 타게
      if (isDev) return `${url.pathname}${url.search}${url.hash}`;

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

  // PROD: VITE_API_BASE_URL origin 붙이기
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  let origin = "";
  try {
    if (apiBase) origin = new URL(apiBase).origin;
  } catch {
    origin = "";
  }
  return origin ? `${origin}${path}` : path;
}
