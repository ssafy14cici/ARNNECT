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

/** 서버 공통 envelope(프로젝트마다 다를 수 있어 optional로 둠) */
type ApiEnvelope<T> = {
  data?: T;
  result?: T;
  message?: string;
  isSuccess?: boolean;
  code?: number | string;
  httpStatus?: string;
};


function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasKey<K extends string>(obj: Record<string, unknown>, key: K): obj is Record<K, unknown> {
  return key in obj;
}

/** envelope/unwrapped 모두 수용해서 T로 뽑아내기 */
function unwrapEnvelope<T>(json: unknown): T {
  // primitive(boolean/string/number/null/undefined)면 그대로
  if (!isRecord(json)) return json as T;

  // data/result가 있으면 우선 반환 (data=false 같은 정상 케이스 포함)
  if (hasKey(json, "data")) return (json as ApiEnvelope<T>).data as T;
  if (hasKey(json, "result")) return (json as ApiEnvelope<T>).result as T;

  // 실패 표시가 명확한 경우
  if (hasKey(json, "isSuccess") && (json as ApiEnvelope<T>).isSuccess === false) {
    const msg = (json as ApiEnvelope<T>).message;
    throw new Error(msg ?? "요청 실패");
  }

  return json as T;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isForm =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  const res = await fetch(url, {
    ...init,
    credentials: "include", // ✅ refreshToken httpOnly cookie 사용 가능
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    json = text; // JSON 아니면 text 그대로 둠
  }

  if (!res.ok) {
    const msg =
      isRecord(json) && hasKey(json, "message")
        ? String(json.message ?? "")
        : typeof json === "string" && json
          ? json
          : `${res.status} ${res.statusText}`;

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

  const ok = await apiFetch<boolean>(`${PREFIX_AUTH}/email/verify?email=${q}`, {
    method: "GET",
  });

  return {
    ok,
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
  fd.append("fieldId", String(payload.fieldId));
  fd.append("debutYear", String(payload.debutYear));
  fd.append("genreId", String(payload.genreId));

  // 옵션
  if (payload.sns) fd.append("sns", payload.sns);
  if (payload.affiliation) fd.append("affiliation", payload.affiliation);
  if (payload.artIntroduction) fd.append("artIntroduction", payload.artIntroduction);

  // 파일(document)
  if (payload.document instanceof File) {
    fd.append("document", payload.document);
  } else if (typeof payload.document === "string" && payload.document) {
    fd.append("document", payload.document);
  }

  await apiFetch<void>(`${PREFIX_MEMBER}/artist/signup`, {
    method: "POST",
    body: fd,
  });
}

/** login 응답에서 accessToken만 안전하게 뽑기 */
function pickAccessToken(raw: unknown): string | null {
  // 1) raw가 envelope일 수도 있으니 unwrap 1회 시도
  const unwrapped = unwrapEnvelope<unknown>(raw);

  if (!isRecord(unwrapped)) return null;

  // BE: new AccessTokenResponse(tokenPair.getAccessToken())
  // => { accessToken: "..." }
  if (hasKey(unwrapped, "accessToken") && typeof unwrapped.accessToken === "string") {
    return unwrapped.accessToken;
  }

  // 혹시 다른 키로 올 가능성 방어(프로젝트 상황에 따라 제거 가능)
  if (hasKey(unwrapped, "token") && typeof unwrapped.token === "string") {
    return unwrapped.token;
  }

  return null;
}

/**
 * 로그인: POST /api/v1/auth/login
 * ✅ Request: { email, password }
 * ✅ Response: { accessToken }
 * ✅ refreshToken은 httpOnly cookie로 세팅됨
 */
export async function loginReal(payload: LoginRequest): Promise<LoginResponse> {
  // ⚠️ BE LoginRequest에는 role이 없으므로 보내지 않음
  const raw = await apiFetch<unknown>(`${PREFIX_AUTH}/login`, {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
    }),
  });

  const accessToken = pickAccessToken(raw);
  if (!accessToken) throw new Error("로그인 응답에 accessToken이 없습니다.");

  return {
    token: accessToken,
    email: payload.email,
    role: payload.role, // 서버가 role을 안 주므로 UI 선택값 유지(이후 /member/my로 확정 추천)
    memberUuid: "",
    name: "",
  };
}
