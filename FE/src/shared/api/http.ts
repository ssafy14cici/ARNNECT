// FE/src/shared/api/http.ts
import axios from "axios";

type TokenGetter = () => string | null;

let getToken: TokenGetter = () => null;

export function bindAuthTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  const skip = (config.headers as any)["x-skip-auth"];
  if (skip === "1" || skip === 1 || skip === true) {
    delete (config.headers as any)["x-skip-auth"];
    return config;
  }

  const token = getToken();
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});
