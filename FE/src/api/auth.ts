// src/api/auth.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
  UserRole,
} from "../types/auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ✅ 로컬 mock DB 키는 딱 1개만 사용
const KEY_USERS = "comet_mock_users_v1";

type StoredUser = {
  email: string;
  password: string;
  role: UserRole; // "USER" | "ARTIST"
  createdAt: string;
};

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(KEY_USERS);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(list: StoredUser[]) {
  localStorage.setItem(KEY_USERS, JSON.stringify(list));
}

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function isEmailLike(v: string) {
  return v.includes("@"); // 필요하면 regex로 강화
}

function findUserByEmail(email: string) {
  const e = normEmail(email);
  return readUsers().find((u) => normEmail(u.email) === e);
}

function assertEmailUnique(email: string) {
  if (findUserByEmail(email)) throw new Error("이미 가입된 이메일입니다.");
}

// -----------------------
// EMAIL DUP CHECK
// -----------------------
export async function apiCheckEmailDup(email: string): Promise<{ available: boolean }> {
  await sleep(200);
  if (!isEmailLike(email)) return { available: false };
  return { available: !Boolean(findUserByEmail(email)) };
}

// -----------------------
// SIGNUP USER
// -----------------------
export async function apiSignupUser(payload: SignupUserRequest): Promise<void> {
  await sleep(300);

  const email = payload.email.trim();

  if (!isEmailLike(email)) throw new Error("이메일을 확인해주세요.");
  if (payload.password.length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");
  if (payload.password !== payload.passwordConfirm) throw new Error("비밀번호 확인이 일치하지 않습니다.");
  if (!payload.name.trim()) throw new Error("이름을 입력해주세요.");
  if (!payload.phone.trim()) throw new Error("전화번호를 입력해주세요.");
  if (!payload.agreements.terms || !payload.agreements.privacy) {
    throw new Error("필수 약관에 동의해주세요.");
  }

  assertEmailUnique(email);

  const list = readUsers();
  list.push({
    email,
    password: payload.password,
    role: "USER",
    createdAt: new Date().toISOString(),
  });
  writeUsers(list);
}

// -----------------------
// SIGNUP ARTIST
// -----------------------
export async function apiSignupArtist(payload: SignupArtistRequest): Promise<void> {
  await sleep(350);

  const email = payload.email.trim();

  if (!isEmailLike(email)) throw new Error("이메일을 확인해주세요.");
  if (payload.password.trim().length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");
  if (!payload.name.trim()) throw new Error("이름을 입력해주세요.");
  if (!payload.phone.trim()) throw new Error("전화번호를 입력해주세요.");

  if (!payload.displayName?.trim()) throw new Error("성명(활동명)을 입력해주세요.");
  if (!payload.artMain || !payload.artSub) throw new Error("예술활동분야를 선택해주세요.");
  if (!payload.birthYear) throw new Error("출생연도를 선택해주세요.");

  // ✅ 예술활동증명: YES면 파일 필수
  if (payload.verified === "YES" && !payload.verifiedFile) {
    throw new Error("예술활동증명 서류를 업로드해주세요.");
  }

  // ✅ intro/profileImage는 선택(요구사항 반영)
  // portfolioFile은 지금 정책상 필요하면 아래 주석 해제
  // if (!payload.portfolioFile) throw new Error("포트폴리오 파일을 업로드해주세요.");

  if (!payload.privacyConsent) throw new Error("개인정보 수집·이용에 동의해주세요.");

  assertEmailUnique(email);

  const list = readUsers();
  list.push({
    email,
    password: payload.password,
    role: "ARTIST",
    createdAt: new Date().toISOString(),
  });
  writeUsers(list);
}

// -----------------------
// LOGIN
// -----------------------
export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  await sleep(250);

  const email = payload.email.trim();

  if (!isEmailLike(email) || !payload.password) {
    throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  }

  const user = findUserByEmail(email);
  if (!user) throw new Error("가입되지 않은 이메일입니다.");

  // ✅ 가입 역할과 선택 역할 일치
  if (user.role !== payload.role) throw new Error("선택한 역할과 가입된 계정 역할이 일치하지 않습니다.");

  // ✅ 비밀번호 일치
  if (user.password !== payload.password) throw new Error("이메일 또는 비밀번호를 확인해주세요.");

  return {
    token: `mock_${payload.role}_${Date.now()}`,
    email,
    role: payload.role,
  };
}
