// FE/src/features/auth/store.ts
import { create } from "zustand";

export type AppRole = "general" | "artist";

export type AuthUser = {
  memberUuid: string;
  name: string;
};

type PersistedAuth = {
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;
};

type AuthState = {
  // ✅ isLoggedIn은 token으로부터 계산되게 유지(상태로 들고 있어도 되지만 일관성 중요)
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;

  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;
  hydrate: () => void;
};

// ✅ key는 프로젝트용으로 바꾸는게 좋음(기존 키 유지해도 동작은 함)
const KEY = "arnnect_auth_v1";

function load(): PersistedAuth | null {
  try {
    // 1) localStorage(로그인 유지) 우선
    const a = localStorage.getItem(KEY);
    if (a) return JSON.parse(a) as PersistedAuth;

    // 2) 없으면 sessionStorage(세션 유지)
    const b = sessionStorage.getItem(KEY);
    if (b) return JSON.parse(b) as PersistedAuth;

    return null;
  } catch {
    return null;
  }
}

function save(partial: PersistedAuth, remember?: boolean) {
  try {
    // remember=true면 localStorage, 아니면 sessionStorage
    if (remember) {
      localStorage.setItem(KEY, JSON.stringify(partial));
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, JSON.stringify(partial));
      localStorage.removeItem(KEY);
    }
  } catch {
    // 저장 실패 시 무시(용량/권한 문제 등)
  }
}

function clear() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export const useAuthStore = create<AuthState>((set) => {
  const saved = load();

  const token = saved?.token ?? null;
  const role = saved?.role ?? null;
  const user = saved?.user ?? null;

  return {
    token,
    role,
    user,
    isLoggedIn: !!token,

    hydrate: () => {
      const next = load();
      const t = next?.token ?? null;
      set({
        token: t,
        role: (next?.role as AppRole) ?? null,
        user: (next?.user as AuthUser) ?? null,
        isLoggedIn: !!t,
      });
    },

    login: ({ token, role, user, remember }) => {
      set({ token, role, user, isLoggedIn: true });
      save({ token, role, user }, remember);
    },

    logout: () => {
      set({ token: null, role: null, user: null, isLoggedIn: false });
      clear();
    },
  };
});
