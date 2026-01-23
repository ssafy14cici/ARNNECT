import { create } from "zustand";
import type { Role } from "../router/guards";

type User = {
  memberUuid: string;   // ✅ 프로필 라우팅에 쓸 ID
  name: string;         // ✅ 화면에 띄울 "진짜 이름"
};

type AuthState = {
  isLoggedIn: boolean;
  role: Role;
  token?: string;

  // ✅ 추가
  user?: User;

  hydrate: () => void;

  // ✅ user를 선택적으로 받을 수 있게 확장(기존 호출 깨지지 않음)
  login: (payload: { token: string; role: Role; remember?: boolean; user?: User }) => void;

  // ✅ 필요 시 로그인 후에만 유저 정보 저장하고 싶을 때 사용
  setUser: (user: User) => void;

  logout: () => void;
};

const LS_KEY = "comet_auth_local";
const SS_KEY = "comet_auth_session";

// ✅ 기존 Stored 확장(호환 유지)
type Stored = { token: string; role: Role; user?: User };

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
  user: undefined,

  hydrate: () => {
    const fromLocal = safeParse(localStorage.getItem(LS_KEY));
    if (fromLocal) {
      set({
        isLoggedIn: true,
        token: fromLocal.token,
        role: fromLocal.role,
        user: fromLocal.user, // ✅
      });
      return;
    }

    const fromSession = safeParse(sessionStorage.getItem(SS_KEY));
    if (fromSession) {
      set({
        isLoggedIn: true,
        token: fromSession.token,
        role: fromSession.role,
        user: fromSession.user, // ✅
      });
      return;
    }

    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
  },

  login: ({ token, role, remember = true, user }) => {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);

    const payload: Stored = { token, role, user }; // ✅ user 저장

    if (remember) localStorage.setItem(LS_KEY, JSON.stringify(payload));
    else sessionStorage.setItem(SS_KEY, JSON.stringify(payload));

    set({ isLoggedIn: true, token, role, user }); // ✅
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
    set({ isLoggedIn: false, role: "general", token: undefined, user: undefined });
  },
}));
