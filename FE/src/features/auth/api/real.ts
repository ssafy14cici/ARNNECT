// FE/src/features/auth/api/real.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
} from "../types";

const API_BASE_RAW = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE = API_BASE_RAW.replace(/\/$/, ""); // 끝 슬래시 제거

const PREFIX_AUTH = "/api/v1/auth";
const PREFIX_MEMBER = "/api/v1/member";

// 백엔드 공통 응답이 data/result 둘 중 하나일 수 있어서 둘 다 수용
type ApiEnvelope<T> = {
  data?: T;
  result?: T;
  message?: string;
  isSuccess?: boolean;
  code?: number;
  httpStatus?: string;
};

function unwrapEnvelope<T>(json: any): T {
  if (!json || typeof json !== "object") return json as T;

  // isSuccess=false인 케이스를 방어적으로 처리
  if ("isSuccess" in json && json.isSuccess === false) {
    throw new Error(json.message ?? "요청 실패");
  }

  if ("data" in json) return (json as ApiEnvelope<T>).data as T;
  if ("result" in json) return (json as ApiEnvelope<T>).result as T;
  return json as T;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  // body가 FormData면 Content-Type을 직접 세팅하면 boundary가 깨짐
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;

  const res = await fetch(url, {
    ...init,
    // 쿠키 세션이면 include 유지. 토큰 방식이면 빼도 됨.
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = json?.message ?? text ?? `${res.status} ${res.statusText}`;
    throw new Error(`HTTP ${res.status} - ${msg}`);
  }

  if (json == null) return undefined as T;
  return unwrapEnvelope<T>(json);
}

/**
 * 이메일 중복/검증: /api/v1/auth/email/verify?email=
 * 실제 응답 형식이 확정 전이라 최대한 방어적으로 처리
 */
export async function checkEmailDupReal(email: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  const q = encodeURIComponent(email.trim());
  const data = await apiFetch<any>(`${PREFIX_AUTH}/email/verify?email=${q}`, {
    method: "GET",
  });

  // 케이스 대응: available / isAvailable / ok / 가능여부 등
  const available =
    Boolean(data?.available) ||
    Boolean(data?.isAvailable) ||
    Boolean(data?.ok) ||
    Boolean(data?.result?.available) ||
    Boolean(data?.result?.ok);

  return {
    available,
    reason: data?.message ?? (available ? "사용 가능" : "사용 불가"),
  };
}

/**
 * 유저 회원가입: POST /api/v1/member/users/signup
 * (유저 endpoint는 기존대로 plural 사용)
 */
export async function signupUserReal(payload: SignupUserRequest): Promise<void> {
  await apiFetch<void>(`${PREFIX_MEMBER}/users/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 예술인 회원가입: POST /api/v1/member/artist/signup  ✅ (Postman 기준 단수)
 * document가 File이면 FormData로 전송, 아니면 JSON 전송
 */
export async function signupArtistReal(payload: SignupArtistRequest): Promise<void> {
  const hasFile = payload.document instanceof File;

  if (hasFile) {
    const fd = new FormData();
    fd.append("email", payload.email);
    fd.append("password", payload.password);
    fd.append("name", payload.name);
    fd.append("nickname", payload.nickname);
    fd.append("phone", payload.phone);
    fd.append("birth", payload.birth);
    fd.append("role", payload.role);
    fd.append("isAgree", String(payload.isAgree));

    fd.append("fieldId", String(payload.fieldId));
    fd.append("debutYear", String(payload.debutYear));
    fd.append("genreId", String(payload.genreId));

    if (payload.sns) fd.append("sns", payload.sns);
    if (payload.affiliation) fd.append("affiliation", payload.affiliation);
    if (payload.artIntroduction) fd.append("artIntroduction", payload.artIntroduction);

    if (payload.document) fd.append("document", payload.document);

    await apiFetch<void>(`${PREFIX_MEMBER}/artist/signup`, {
      method: "POST",
      body: fd,
    });
    return;
  }

  // JSON 전송(지금 Postman처럼 "document": "file" 형태도 커버)
  await apiFetch<void>(`${PREFIX_MEMBER}/artist/signup`, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      document: payload.document ?? undefined,
    }),
  });
}

/**
 * 로그인: POST /api/v1/auth/login
 * 실제 응답 필드명은 백엔드와 최종 동기화 필요
 */
export async function loginReal(payload: LoginRequest): Promise<LoginResponse> {
  const data = await apiFetch<any>(`${PREFIX_AUTH}/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    token: data?.token ?? "cookie-session",
    email: data?.email ?? payload.email,
    role: (data?.role ?? payload.role) as any,
    memberUuid: String(data?.memberUuid ?? data?.memberUUID ?? data?.id ?? ""),
    name: data?.name ?? data?.nickname ?? "user",
  };
}
