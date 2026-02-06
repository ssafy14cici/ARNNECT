// FE/src/features/tickets/resolveTicketMedia.ts
const ENV = ((import.meta as any).env ?? {}) as Record<string, unknown>;
const RAW_BASE_URL = typeof ENV.VITE_API_BASE_URL === "string" ? (ENV.VITE_API_BASE_URL as string) : "";
const BASE_URL = RAW_BASE_URL.trim().replace(/\/$/, "");

export function resolveTicketMedia(pathOrName?: string | null) {
  if (!pathOrName) return "";
  const v = String(pathOrName).trim();
  if (!v) return "";

  // 이미 절대 URL
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // "/src/ticket/..." 같은 루트 경로
  if (v.startsWith("/")) return `${BASE_URL}${v}`;

  // "src/ticket/..." 같은 상대 경로
  if (v.startsWith("src/")) return `${BASE_URL}/${v}`;

  // 파일명만 오는 경우 fallback
  return `${BASE_URL}/src/ticket/${v}`;
}


// // FE/src/features/tickets/resolveTicketMedia.ts
// export function resolveTicketMedia(nameOrUrl: string) {
//   if (!nameOrUrl) return "";

//   // already absolute / data
//   if (nameOrUrl.startsWith("data:image/")) return nameOrUrl;
//   if (nameOrUrl.startsWith("http://") || nameOrUrl.startsWith("https://")) return nameOrUrl;

//   // proxy 환경: 프론트 origin으로 요청 → dev proxy가 BE로 전달
//   if (nameOrUrl.startsWith("/")) return nameOrUrl;
//   return `/${nameOrUrl}`;
// }
