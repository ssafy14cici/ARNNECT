// FE/src/features/tickets/resolveTicketMedia.ts
import { API_BASE_URL } from "../../../shared/config/env";

/**
 * 서버가 내려주는 미디어 경로(/ticket/xxx.png, /qrcode/xxx.png)를
 * "백엔드 origin" 기준의 절대 URL로 변환한다.
 */
export function resolveTicketMedia(path?: string) {
  if (!path) return "";

  // 이미 절대 URL이면 그대로
  if (/^https?:\/\//i.test(path)) return path;

  // data URL이면 그대로
  if (path.startsWith("data:")) return path;

  // API_BASE_URL이 예: https://i14e103.p.ssafy.io:8443/api/v1 라면
  // origin만 뽑아서 붙인다.
  const origin = API_BASE_URL ? new URL(API_BASE_URL).origin : window.location.origin;

  // path가 "/ticket/..."처럼 시작하므로 origin + path
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}
