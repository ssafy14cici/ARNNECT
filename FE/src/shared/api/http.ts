// FE/src/shared/api/http.ts
import axios from "axios";
import { useAuthStore } from "../../features/auth/store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // ✅ refreshToken(httpOnly cookie) 포함 가능
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
