// FE/src/shared/api/http.ts
// import axios from "axios";

// export const http = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL, // 👈 환경변수로 결정
// });

// FE/src/shared/api/http.ts
import axios from "axios";
import { useAuthStore } from "@/features/auth/store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const s: any = useAuthStore.getState();

  // ✅ 실제 프로젝트 키에 맞춰 하나로 통일 (아래 후보 중 맞는 걸로 확정)
  const raw = s.accessToken ?? s.token;

  if (typeof raw === "string" && raw.length > 0) {
    const value = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
    config.headers = config.headers ?? {};
    config.headers.Authorization = value;
  }

  return config;
});
