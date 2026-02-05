// FE/src/shared/api/http.ts
import axios from "axios";

type TokenGetter = () => string | null;

// ✅ auth store를 여기서 import 하지 말고, 바깥에서 주입 받기
let getToken: TokenGetter = () => null;

export function bindAuthTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // refreshToken(httpOnly cookie) 포함 가능
});

http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  // ✅ 특정 요청에서 Authorization 주입을 스킵하고 싶을 때
  const skip = (config.headers as any)["x-skip-auth"];
  if (skip === "1" || skip === 1 || skip === true) {
    delete (config.headers as any)["x-skip-auth"]; // 서버로 보내지 않음
    return config;
  }

  const token = getToken();
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});
