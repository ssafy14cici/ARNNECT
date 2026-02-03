// FE/src/shared/api/http.ts
import axios from "axios";
import { useAuthStore } from "@/features/auth/store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const s: any = useAuthStore.getState();

  // ✅ 토큰 키 후보(프로젝트마다 다름)
  const raw =
    s.accessToken ??
    s.token ??
    s.authToken ??
    s.tokens?.accessToken;

  // ✅ 지금 이 요청이 http를 타는지 + 토큰이 있는지 확인 (임시 로그)
  console.log("[http] request:", config.method?.toUpperCase(), config.url);
  console.log("[http] token exists:", !!raw);
  console.log("[http] auth keys:", Object.keys(s));

  if (typeof raw === "string" && raw.length > 0) {
    const value = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;

    // ✅ axios v1: AxiosHeaders 타입일 수 있어서 set 방식이 제일 안전함
    if (config.headers && typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", value);
    } else {
      config.headers = {
        ...(config.headers as any),
        Authorization: value,
      };
    }
  }

  // ✅ 최종적으로 Authorization이 세팅됐는지 확인 (임시 로그)
  const hasAuth =
    !!(config.headers as any)?.Authorization ||
    (config.headers && typeof (config.headers as any).get === "function"
      ? !!(config.headers as any).get("Authorization")
      : false);

  console.log("[http] auth header set:", hasAuth);

  return config;
});
