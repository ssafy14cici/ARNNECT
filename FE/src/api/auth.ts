// src/api/auth.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
  UserRole,
} from "../../types/auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ✅ mock storage keys
const KEY_USERS = "mock_users_v1";

type StoredUser = {
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
};

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_USERS) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

function isEmailLike(v: string) {
  return v.includes("@"); // 원하면 regex로 강화 가능
}

function assertUniqueEmail(email: string) {
  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error("이미 가입된 이메일입니다.");
  }
}

function findUser(email: string) {
  const users = loadUsers();
  return users.find((u) => u.email === email);
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

  // ✅ 실제로 가입된 계정인지 확인
  const user = findUser(email);
  if (!user) throw new Error("가입되지 않은 이메일입니다.");

  // ✅ 역할까지 일치해야 로그인 성공
  if (user.role !== payload.role) {
    throw new Error("선택한 역할과 가입된 계정 역할이 일치하지 않습니다.");
  }

  // ✅ 비밀번호 검증
  if (user.password !== payload.password) {
    throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  }

  return {
    token: `mock_${payload.role}_${Date.now()}`,
    email,
    role: payload.role,
  };
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
  if (!payload.agreements.terms || !payload.agreements.privacy) {
    throw new Error("필수 약관에 동의해주세요.");
  }

  // ✅ 저장 (가입 처리)
  assertUniqueEmail(email);
  const users = loadUsers();
  users.push({
    email,
    password: payload.password,
    role: "USER",
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
}

// -----------------------
// SIGNUP ARTIST
// -----------------------
export async function apiSignupArtist(payload: SignupArtistRequest): Promise<void> {
  await sleep(350);

  const email = payload.email.trim();

  if (!isEmailLike(email)) throw new Error("이메일을 확인해주세요.");
  if (!payload.displayName) throw new Error("성명(활동명)을 입력해주세요.");
  if (!payload.artMain || !payload.artSub) throw new Error("예술활동분야를 선택해주세요.");
  if (!payload.intro) throw new Error("예술활동 소개를 입력해주세요.");
  if (!payload.profileImage) throw new Error("프로필 이미지를 업로드해주세요.");
  if (!payload.portfolioFile) throw new Error("포트폴리오 파일을 업로드해주세요.");
  if (!payload.privacyConsent) throw new Error("개인정보 수집·이용에 동의해주세요.");

  // ✅ 저장 (가입 처리)
  assertUniqueEmail(email);
  const users = loadUsers();
  users.push({
    email,
    password: payload.password,
    role: "ARTIST",
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
}
