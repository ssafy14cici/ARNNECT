// FE/src/features/auth/store.ts
import { create } from "zustand";

export type AppRole = "general" | "artist";

export type AuthUser = {
  memberUuid: string;
  name: string;
};

type AuthState = {
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;

  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;
  hydrate: () => void;
};

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

// ✅ mock에서는 localStorage, real에서는 sessionStorage(remember 체크 시에만 저장)
const KEY_MOCK = "comet_mock_auth_v1";
const KEY_REAL = "arnnect_auth_session_v1";

type PersistShape = Pick<AuthState, "token" | "role" | "user">;

function safeParse(raw: string | null): PersistShape | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistShape;
  } catch {
    return null;
  }
}

function loadPersisted(): PersistShape | null {
  try {
    const storage = USE_MOCK ? localStorage : sessionStorage;
    const key = USE_MOCK ? KEY_MOCK : KEY_REAL;
    return safeParse(storage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * ✅ 저장 정책
 * - mock: 항상 localStorage 저장(기존 정책 유지)
 * - real: remember=true일 때만 sessionStorage 저장
 */
function savePersisted(partial: PersistShape, remember?: boolean) {
  try {
    if (USE_MOCK) {
      localStorage.setItem(KEY_MOCK, JSON.stringify(partial));
      return;
    }
    // real 모드: remember 체크 안 하면 저장하지 않음
    if (!remember) {
      sessionStorage.removeItem(KEY_REAL);
      return;
    }
    sessionStorage.setItem(KEY_REAL, JSON.stringify(partial));
  } catch {
    // ignore
  }
}

function clearPersisted() {
  try {
    if (USE_MOCK) localStorage.removeItem(KEY_MOCK);
    sessionStorage.removeItem(KEY_REAL);
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const saved = loadPersisted();

  return {
    isLoggedIn: !!saved?.token,
    token: saved?.token ?? null,
    role: saved?.role ?? null,
    user: saved?.user ?? null,

    /**
     * ✅ hydrate 정책
     * - mock: localStorage 복구
     * - real: sessionStorage(remember=true로 저장된 경우)만 복구
     *   (중요) real 모드에서 load가 null이면 "강제 로그아웃 set" 하지 않음
     *   → 초기 상태를 유지하게 해서 페이지 이동/레이아웃 재마운트 때 로그아웃 덮어쓰기 방지
     */
    hydrate: () => {
      const next = loadPersisted();

      // ✅ real 모드에서 저장된 세션이 없다면 아무 것도 덮어쓰지 않음
      if (!USE_MOCK && !next) return;

      set({
        isLoggedIn: !!next?.token,
        token: next?.token ?? null,
        role: (next?.role as AppRole) ?? null,
        user: (next?.user as AuthUser) ?? null,
      });
    },

    login: ({ token, role, remember, user }) => {
      set({ isLoggedIn: true, token, role, user });
      savePersisted({ token, role, user }, remember);
    },

    logout: () => {
      set({ isLoggedIn: false, token: null, role: null, user: null });
      clearPersisted();
    },
  };
});
