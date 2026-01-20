// FE/src/stores/authStore.ts
import { create } from "zustand";
import type { Role } from "../router/guards";

type AuthState = {
  isLoggedIn: boolean;
  role: Role;
  token?: string;

  hydrate: () => void;
  // ✅ remember 추가(기본 true로 두면 기존 코드 안 깨짐)
  login: (payload: { token: string; role: Role; remember?: boolean }) => void;
  logout: () => void;
};

const LS_KEY = "comet_auth_local";
const SS_KEY = "comet_auth_session";

type Stored = { token: string; role: Role };

function safeParse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: "general",
  token: undefined,

  hydrate: () => {
    // ✅ localStorage 우선, 없으면 sessionStorage
    const fromLocal = safeParse(localStorage.getItem(LS_KEY));
    if (fromLocal) {
      set({ isLoggedIn: true, token: fromLocal.token, role: fromLocal.role });
      return;
    }

    const fromSession = safeParse(sessionStorage.getItem(SS_KEY));
    if (fromSession) {
      set({ isLoggedIn: true, token: fromSession.token, role: fromSession.role });
      return;
    }

    // 둘 다 깨졌거나 없으면 정리
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
  },

  login: ({ token, role, remember = true }) => {
    // ✅ 저장소 1개만 쓰도록 정리
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);

    const payload: Stored = { token, role };
    if (remember) localStorage.setItem(LS_KEY, JSON.stringify(payload));
    else sessionStorage.setItem(SS_KEY, JSON.stringify(payload));

    set({ isLoggedIn: true, token, role });
  },

  logout: () => {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
    set({ isLoggedIn: false, role: "general", token: undefined });
  },
}));
