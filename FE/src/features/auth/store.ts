//FE\src\features\auth\store.ts
import { create } from "zustand";

export type AppRole = "general" | "artist";

export type AuthUser = {
  memberUuid: string;
  name: string;
};

type PersistShape = {
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;
};

type AuthState = {
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;

  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;
  hydrate: () => void; // ✅ AppLayout에서 호출
};

const KEY = "comet_mock_auth_v2";

function load(): PersistShape | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PersistShape) : null;
  } catch {
    return null;
  }
}

function save(p: PersistShape) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const useAuthStore = create<AuthState>((set, get) => {
  const saved = load();

  return {
    isLoggedIn: !!saved?.token,
    token: saved?.token ?? null,
    role: saved?.role ?? null,
    user: saved?.user ?? null,

    login: ({ token, role, remember, user }) => {
      set({ isLoggedIn: true, token, role, user });
      if (remember) save({ token, role, user });
      else localStorage.removeItem(KEY); // 세션만 유지하고 싶으면 여기 정책 바꾸면 됨
    },

    logout: () => {
      set({ isLoggedIn: false, token: null, role: null, user: null });
      localStorage.removeItem(KEY);
    },

    hydrate: () => {
      const next = load();
      if (!next?.token) {
        set({ isLoggedIn: false, token: null, role: null, user: null });
        return;
      }
      set({
        isLoggedIn: true,
        token: next.token ?? null,
        role: next.role ?? null,
        user: next.user ?? null,
      });
    },
  };
});
