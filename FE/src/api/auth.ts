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

// -----------------------
// TYPES
// -----------------------
type StoredUser = {
  email: string;
  password: string;
  role: UserRole; // "USER" | "ARTIST"
  createdAt: string;
};

// -----------------------
// HELPERS (storage)
// -----------------------
function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(KEY_USERS);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

// -----------------------
// ✅ SEED (기본 계정 자동 주입)
// - 로컬/도커(origin 달라도) 각각의 localStorage에 자동으로 심김
// - 이미 있으면 중복으로 안 심음
// -----------------------
function seedMockUsers() {
  const list = loadUsers();

  const hasUser = list.some((u) => normEmail(u.email) === "user@test.com");
  const hasArtist = list.some((u) => normEmail(u.email) === "artist@test.com");

  const next = [...list];

  if (!hasUser) {
    next.unshift({
      email: "user@test.com",
      password: "123456789",
      role: "USER",
      createdAt: new Date().toISOString(),
    });
  }

  if (!hasArtist) {
    next.unshift({
      email: "artist@test.com",
      password: "123456789",
      role: "ARTIST",
      createdAt: new Date().toISOString(),
    });
  }

  // 바뀐 경우만 저장 (불필요한 write 방지)
  if (next.length !== list.length) saveUsers(next);
}

// -----------------------
// HELPERS (validation)
// -----------------------
function isEmailLike(v: string) {
  // 필요하면 regex로 강화 가능. 지금은 최소 조건.
  return v.includes("@");
}

function findUserByEmail(email: string) {
  const e = normEmail(email);
  return loadUsers().find((u) => normEmail(u.email) === e);
}

function assertEmailUnique(email: string) {
  if (findUserByEmail(email)) throw new Error("이미 가입된 이메일입니다.");
}

// -----------------------
// EMAIL DUP CHECK
// -----------------------
export async function apiCheckEmailDup(
  email: string
): Promise<{ available: boolean; reason?: string }> {
  seedMockUsers(); // ✅ 추가
  await sleep(200);

  const e = email.trim();
  if (!e) return { available: false, reason: "이메일을 입력해주세요." };
  if (!isEmailLike(e)) return { available: false, reason: "이메일 형식을 확인해주세요." };

  const exists = !!findUserByEmail(e);
  return {
    available: !exists,
    reason: exists ? "이미 사용 중인 이메일입니다." : "사용 가능한 이메일입니다.",
  };
}

// -----------------------
// SIGNUP USER
// -----------------------
export async function apiSignupUser(payload: SignupUserRequest): Promise<void> {
  seedMockUsers(); // ✅ 추가
  await sleep(300);

  const email = payload.email.trim();

  if (!isEmailLike(email)) throw new Error("이메일을 확인해주세요.");
  if (!payload.name.trim()) throw new Error("이름을 입력해주세요.");
  if (!payload.phone.trim()) throw new Error("전화번호를 입력해주세요.");
  if (payload.password.trim().length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");
  if (payload.password !== payload.passwordConfirm) throw new Error("비밀번호 확인이 일치하지 않습니다.");
  if (!payload.agreements?.terms || !payload.agreements?.privacy) {
    throw new Error("필수 약관에 동의해주세요.");
  }

  // ✅ 공통 DB에서 이메일 중복 체크
  assertEmailUnique(email);

  const list = loadUsers();
  list.push({
    email,
    password: payload.password,
    role: "USER",
    createdAt: new Date().toISOString(),
  });
  saveUsers(list);
}

// -----------------------
// SIGNUP ARTIST
// -----------------------
export async function apiSignupArtist(payload: SignupArtistRequest): Promise<void> {
  seedMockUsers(); // ✅ 추가
  await sleep(350);

  const email = payload.email.trim();

  if (!isEmailLike(email)) throw new Error("이메일을 확인해주세요.");
  if (!payload.name.trim()) throw new Error("이름을 입력해주세요.");
  if (!payload.phone.trim()) throw new Error("전화번호를 입력해주세요.");
  if (payload.password.trim().length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");

  if (!payload.displayName?.trim()) throw new Error("성명(활동명)을 입력해주세요.");
  if (!payload.artMain || !payload.artSub) throw new Error("예술활동분야를 선택해주세요.");
  if (!payload.birthYear) throw new Error("출생연도를 선택해주세요.");

  // ✅ 예술활동증명: YES면 파일 필수
  if (payload.verified === "YES" && !payload.verifiedFile) {
    throw new Error("예술활동증명 서류를 업로드해주세요.");
  }

  if (!payload.privacyConsent) throw new Error("개인정보 수집·이용에 동의해주세요.");

  // ✅ 공통 DB에서 이메일 중복 체크
  assertEmailUnique(email);

  const list = loadUsers();
  list.push({
    email,
    password: payload.password,
    role: "ARTIST",
    createdAt: new Date().toISOString(),
  });
  saveUsers(list);
}

// -----------------------
// LOGIN
// -----------------------
export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  seedMockUsers(); // ✅ 추가
  await sleep(250);

  const email = payload.email.trim();

  if (!isEmailLike(email) || !payload.password) {
    throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  }

  const user = findUserByEmail(email);
  if (!user) throw new Error("가입되지 않은 이메일입니다.");

  // ✅ 가입 역할과 선택 역할 일치
  if (user.role !== payload.role) {
    throw new Error("선택한 역할과 가입된 계정 역할이 일치하지 않습니다.");
  }

  // ✅ 비밀번호 일치
  if (user.password !== payload.password) {
    throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  }

  return {
    token: `mock_${payload.role}_${Date.now()}`,
    email: user.email,
    role: payload.role,
  };
}
