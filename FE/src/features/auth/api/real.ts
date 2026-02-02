// FE/src/features/auth/api/real.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const PREFIX_AUTH = "/api/v1/auth";
const PREFIX_MEMBER = "/api/v1/member";

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  isSuccess?: boolean;
  code?: number;
  httpStatus?: string;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
    );
  }

  const text = await res.text().catch(() => "");
  if (!text) return undefined as T;

  const json = JSON.parse(text) as unknown;
  if (json && typeof json === "object" && "data" in (json as any)) {
    return (json as ApiEnvelope<T>).data as T;
  }
  return json as T;
}

/**
 * 이메일 검증/중복확인: /api/v1/auth/email/verify?email=
 * (명세가 “검증”이라 실제 응답 형태는 백엔드랑 최종 확인 필요)
 */
export async function checkEmailDupReal(email: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  const q = encodeURIComponent(email.trim());
  const data = await apiFetch<any>(`${PREFIX_AUTH}/email/verify?email=${q}`, {
    method: "GET",
  });

  // ⚠️ 백엔드 응답 확정 전까지는 최대한 방어적으로 처리
  // - data.available / data.isAvailable / data.ok 등 케이스 대응
  const available =
    Boolean(data?.available) ||
    Boolean(data?.isAvailable) ||
    Boolean(data?.ok);

  return {
    available,
    reason: data?.message ?? (available ? "사용 가능" : "사용 불가"),
  };
}

export async function signupUserReal(payload: SignupUserRequest): Promise<void> {
  await apiFetch<void>(`${PREFIX_MEMBER}/users/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function signupArtistReal(
  payload: SignupArtistRequest,
): Promise<void> {
  await apiFetch<void>(`${PREFIX_MEMBER}/artists/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginReal(payload: LoginRequest): Promise<LoginResponse> {
  // 명세: /api/v1/auth/login
  // ⚠️ 실제 응답 필드(memberUuid, name 등) 백엔드랑 맞춰야 함
  const data = await apiFetch<any>(`${PREFIX_AUTH}/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    token: data?.token ?? "cookie-session",
    email: data?.email ?? payload.email,
    role: data?.role ?? payload.role,
    memberUuid: data?.memberUuid ?? data?.memberUUID ?? data?.id,
    name: data?.name ?? data?.nickname ?? "user",
  };
}
