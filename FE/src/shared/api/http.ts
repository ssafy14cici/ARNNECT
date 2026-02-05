// FE/src/shared/api/http.ts
import axios from "axios";

type TokenGetter = () => string | null;

const AUTH_SS_KEY = "arnnect_auth_ss";

// arnnect_auth_ss에서 accessToken 추출
function readTokenFromSessionStorage(): string | null {
  const raw = sessionStorage.getItem(AUTH_SS_KEY);
  if (!raw) return null;

  const s = raw.trim();

  // (1) 토큰 자체로 저장된 경우(JWT)
  if (s.includes(".") && s.split(".").length === 3) return s;

  // (2) JSON으로 저장된 경우
  try {
    const obj: any = JSON.parse(s);

    // 프로젝트마다 구조가 달라서 후보들을 넓게 잡음
    const candidates = [
      obj?.accessToken,
      obj?.token,
      obj?.state?.accessToken,  // persist 형태에서 흔함
      obj?.data?.accessToken,
      obj?.auth?.accessToken,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  } catch {
    // ignore
  }

  return null;
}

// ✅ 기본은 storage 기반으로(새로고침 직후에도 살아있게)
let getToken: TokenGetter = () => readTokenFromSessionStorage();

// ✅ 바인딩된 getter가 null이면 storage fallback
export function bindAuthTokenGetter(fn: TokenGetter) {
  getToken = () => fn() ?? readTokenFromSessionStorage();
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  // axios v1에서 headers는 AxiosHeaders일 수 있음
  const headers: any = config.headers ?? (config.headers = {});

  const skip =
    typeof headers.get === "function" ? headers.get("x-skip-auth") : headers["x-skip-auth"];

  if (skip === "1" || skip === 1 || skip === true) {
    if (typeof headers.delete === "function") headers.delete("x-skip-auth");
    else delete headers["x-skip-auth"];
    return config;
  }

  const token = getToken();
  if (token) {
    if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${token}`);
    else headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
