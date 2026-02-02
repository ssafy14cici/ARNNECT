// FE/src/features/auth/api/real.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
} from "../types";

const API_BASE_RAW = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE = API_BASE_RAW.replace(/\/$/, "");

const PREFIX_AUTH = "/api/v1/auth";
const PREFIX_MEMBER = "/api/v1/member";

type ApiEnvelope<T> = {
  data?: T;
  result?: T;
  message?: string;
  isSuccess?: boolean;
  code?: number;
  httpStatus?: string;
};

function unwrapEnvelope<T>(json: any): T {
  // primitive(boolean/string/number)면 그대로
  if (json == null) return json as T;
  if (typeof json !== "object") return json as T;

  // data/result가 있으면 우선 반환 (data=false 같은 정상 케이스 포함)
  if ("data" in json) return (json as ApiEnvelope<T>).data as T;
  if ("result" in json) return (json as ApiEnvelope<T>).result as T;

  if ("isSuccess" in json && json.isSuccess === false) {
    throw new Error(json.message ?? "요청 실패");
  }

  return json as T;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isForm =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  const res = await fetch(url, {
    ...init,
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
 * 이메일 중복 확인: /api/v1/auth/email/verify?email=
 * ✅ 서버 응답: boolean(true/false) 단일 값
 * - true  => 사용 가능
 * - false => 사용 불가
 */
export async function checkEmailDupReal(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const q = encodeURIComponent(email.trim());

  // 서버가 true/false 본문만 반환하므로 그대로 받는다
  const ok = await apiFetch<boolean>(`${PREFIX_AUTH}/email/verify?email=${q}`, {
    method: "GET",
  });

  return {
    ok, // true=사용 가능, false=사용 불가
    message: ok ? "사용 가능" : "사용 불가",
  };
}



/**
 * 유저 회원가입: POST /api/v1/member/users/signup
 */
export async function signupUserReal(payload: SignupUserRequest): Promise<void> {
  await apiFetch<void>(`${PREFIX_MEMBER}/users/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 예술인 회원가입: POST /api/v1/member/artist/signup
 * ✅ Postman 기준 multipart/form-data
 * ✅ fieldId는 DB에 1개 뿐 → 프론트에서 1로 고정해서 보냄
 */
export async function signupArtistReal(payload: SignupArtistRequest): Promise<void> {
  const fd = new FormData();

  // 필수
  fd.append("email", payload.email);
  fd.append("password", payload.password);
  fd.append("name", payload.name);
  fd.append("nickname", payload.nickname);
  fd.append("phone", payload.phone);
  fd.append("birth", payload.birth);
  fd.append("role", payload.role);
  fd.append("isAgree", String(payload.isAgree));

  // 고정/필수 값
  fd.append("fieldId", String(payload.fieldId)); // ✅ 1 고정
  fd.append("debutYear", String(payload.debutYear));
  fd.append("genreId", String(payload.genreId));

  // 옵션
  if (payload.sns) fd.append("sns", payload.sns);
  if (payload.affiliation) fd.append("affiliation", payload.affiliation);
  if (payload.artIntroduction) fd.append("artIntroduction", payload.artIntroduction);

  // 파일(document) - 실제로 파일이면 append
  if (payload.document instanceof File) {
    fd.append("document", payload.document);
  } else if (typeof payload.document === "string" && payload.document) {
    // 백엔드가 string도 허용하는 경우 대비(보통은 안 씀)
    fd.append("document", payload.document);
  }

  await apiFetch<void>(`${PREFIX_MEMBER}/artist/signup`, {
    method: "POST",
    body: fd,
  });
}

/**
 * 로그인: POST /api/v1/auth/login
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
