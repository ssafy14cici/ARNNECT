// FE/src/shared/api/http.ts
import axios from "axios";
import { useAuthStore } from "../../features/auth/store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // ✅ refreshToken(httpOnly cookie) 포함 가능
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  // axios v1에서 headers 타입이 케이스별로 달라 any로 처리
  config.headers = (config.headers ?? {}) as any;

  // ✅ refresh 등 토큰 없이 호출해야 하는 요청은 스킵 플래그 허용
  const skipAuth = (config.headers as any)["x-skip-auth"] === "1";

  if (!skipAuth && token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else {
    // ✅ token 없거나 스킵이면 과거 Authorization 잔존 방지
    delete (config.headers as any).Authorization;
  }

  return config;
});
