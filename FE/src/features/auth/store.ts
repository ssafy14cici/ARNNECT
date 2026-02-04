// FE/src/features/auth/store.ts
import { create } from "zustand";

export type AppRole = "general" | "artist";
export type AuthUser = { memberUuid: string; name: string };

type AuthState = {
  hydrated: boolean;          // ✅ 추가
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;

  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;
  hydrate: () => void;
};

const KEY = "comet_mock_auth_v1";
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

function load(): Partial<AuthState> | null {
  if (!USE_MOCK) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<AuthState>) : null;
  } catch {
    return null;
  }
}

function save(partial: Partial<AuthState>) {
  if (!USE_MOCK) return;
  localStorage.setItem(KEY, JSON.stringify(partial));
}

export const useAuthStore = create<AuthState>((set) => {
  const saved = load();

  return {
    hydrated: false, // ✅ 초기 false
    isLoggedIn: !!saved?.token,
    token: saved?.token ?? null,
    role: saved?.role ?? null,
    user: saved?.user ?? null,

    hydrate: () => {
      const next = load();
      set({
        hydrated: true, // ✅ hydrate 끝
        isLoggedIn: !!next?.token,
        token: next?.token ?? null,
        role: (next?.role as AppRole) ?? null,
        user: (next?.user as AuthUser) ?? null,
      });
    },

    login: ({ token, role, user }) => {
      set({ hydrated: true, isLoggedIn: true, token, role, user });
      save({ token, role, user });
    },

    logout: () => {
      set({ hydrated: true, isLoggedIn: false, token: null, role: null, user: null });
      if (USE_MOCK) localStorage.removeItem(KEY);
    },
  };
});
