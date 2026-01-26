// FE/src/mocks/authMock.ts
import type { UserRole } from "../types/auth";

type MockAccount = {
  id: string;
  email: string;
  password: string;
  role: UserRole; // "USER" | "ARTIST"
  name: string;
  displayName?: string;
  createdAt: string;
};

const ACC_KEY = "arnnect.mock.accounts";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadAccounts(): MockAccount[] {
  const raw = localStorage.getItem(ACC_KEY);
  return raw ? (JSON.parse(raw) as MockAccount[]) : [];
}

function saveAccounts(list: MockAccount[]) {
  localStorage.setItem(ACC_KEY, JSON.stringify(list));
}

/**
 * ✅ 로컬/도커(다른 origin) 모두에서 동작하도록:
 * - "기본 계정이 없으면" 항상 주입
 * - 이미 있으면 중복 주입 안 함
 */
export function seedMockAccounts() {
  const list = loadAccounts();

  const hasUser = list.some((a) => a.email.toLowerCase() === "user@test.com");
  const hasArtist = list.some((a) => a.email.toLowerCase() === "artist@test.com");

  const next = [...list];

  if (!hasUser) {
    next.unshift({
      id: uid(),
      email: "user@test.com",
      password: "123456789",
      role: "USER",
      name: "테스트유저",
      createdAt: new Date().toISOString(),
    });
  }

  if (!hasArtist) {
    next.unshift({
      id: uid(),
      email: "artist@test.com",
      password: "123456789",
      role: "ARTIST",
      name: "테스트예술가",
      displayName: "artist",
      createdAt: new Date().toISOString(),
    });
  }

  saveAccounts(next);
}

export async function mockLogin(payload: {
  email: string;
  password: string;
  role: UserRole;
  remember?: boolean;
}) {
  seedMockAccounts();

  const email = payload.email.trim().toLowerCase();
  const list = loadAccounts();

  const acc = list.find((a) => a.email.toLowerCase() === email);
  if (!acc) {
    throw new Error("가입되지 않은 이메일입니다.");
  }

  if (acc.password !== payload.password) {
    throw new Error("비밀번호가 올바르지 않습니다.");
  }

  // 탭(일반/예술인)과 계정 role이 불일치하면 명확히 안내
  if (acc.role !== payload.role) {
    throw new Error("선택한 역할과 계정 유형이 일치하지 않습니다.");
  }

  return {
    token: "mock-" + uid(),
    role: acc.role, // "USER" | "ARTIST"
    email: acc.email,
    name: acc.name,
  };
}
