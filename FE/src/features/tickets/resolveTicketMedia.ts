// // FE/src/features/tickets/resolveTicketMedia.ts

// /**
//  * 서버가 내려주는 미디어 경로(/ticket/xxx.png, /qrcode/xxx.png)를
//  * 앱에서 사용할 수 있는 URL로 정규화한다.
//  *
//  * 규칙:
//  * - 빈 값/"null"/"undefined" -> ""
//  * - data:/blob: -> 그대로
//  * - 절대 URL(https?) -> (DEV면) 프록시 타도록 pathname만 반환, (PROD면) 그대로(필요시 /src 프리픽스)
//  * - 상대 경로 -> (DEV면) 프록시 경로 반환, (PROD면) VITE_API_BASE_URL의 origin을 붙여 절대 URL로 반환
//  * - /qrcode/, /ticket/ 은 필요 시 /src 프리픽스를 붙임(이미 /src/로 시작하면 제외)
//  */
// export function resolveTicketMedia(input?: string | null): string {
//   const u0 = String(input ?? "").trim();
//   if (!u0 || u0 === "null" || u0 === "undefined") return "";

//   // data/blob URL이면 그대로 사용
//   if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

//   const needsSrcPrefix = (p: string) =>
//     !p.startsWith("/src/") && (p.startsWith("/qrcode/") || p.startsWith("/ticket/"));

//   const isDev = !!import.meta.env.DEV;

//   // 1) 절대 URL 처리
//   if (/^https?:\/\//i.test(u0)) {
//     try {
//       const url = new URL(u0);

//       // /qrcode, /ticket 경로면 /src 프리픽스 보정
//       if (needsSrcPrefix(url.pathname)) {
//         url.pathname = `/src${url.pathname}`;
//       }

//       // DEV에서는 절대 URL을 상대경로로 바꿔서 프록시 타게
//       if (isDev) {
//         return `${url.pathname}${url.search}${url.hash}`;
//       }

//       // PROD에서는 보정된 절대 URL 그대로
//       return url.toString();
//     } catch {
//       // URL 파싱 실패 시 원문 반환
//       return u0;
//     }
//   }

//   // 2) 상대 경로 처리
//   let path = u0.startsWith("/") ? u0 : `/${u0}`;

//   // /qrcode, /ticket 경로면 /src 프리픽스 보정
//   if (needsSrcPrefix(path)) {
//     path = `/src${path}`;
//   }

//   // DEV: 프록시
//   if (isDev) return path;

//   // PROD: VITE_API_BASE_URL origin 붙이기
//   const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();

//   let origin = "";
//   try {
//     if (apiBase) origin = new URL(apiBase).origin;
//   } catch {
//     origin = "";
//   }

//   return origin ? `${origin}${path}` : path;
// }

// FE/src/features/tickets/resolveTicketMedia.ts
export function resolveMediaUrl(input?: string | null): string {
  const u0 = String(input ?? "").trim();
  if (!u0 || u0 === "null" || u0 === "undefined") return "";
  if (u0.startsWith("data:") || u0.startsWith("blob:")) return u0;

  const needsSrcPrefix = (p: string) =>
    !p.startsWith("/src/") && (p.startsWith("/qrcode/") || p.startsWith("/ticket/"));

  const isDev = !!import.meta.env.DEV;

  // 1) absolute url
  if (/^https?:\/\//i.test(u0)) {
    try {
      const url = new URL(u0);
      if (needsSrcPrefix(url.pathname)) {
        url.pathname = `/src${url.pathname}`;
      }
      // DEV에서는 프록시 타게 상대경로로 변경
      if (isDev) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return u0;
    }
  }

  // 2) relative path
  let path = u0.startsWith("/") ? u0 : `/${u0}`;
  if (needsSrcPrefix(path)) {
    path = `/src${path}`;
  }

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

// 기존 코드 호환용 alias
export function resolveTicketMedia(path?: string) {
  return resolveMediaUrl(path);
}
