import { create } from "zustand";
import type { Role } from "../router/guards";

type AuthState = {
  isLoggedIn: boolean;
  role: Role;
  token?: string;

  hydrate: () => void;
  login: (payload: { token: string; role: Role }) => void;
  logout: () => void;
};

const STORAGE_KEY = "comet_auth";

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  role: "general",
  token: undefined,

  hydrate: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { token: string; role: Role };
      set({ isLoggedIn: true, token: parsed.token, role: parsed.role });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  login: ({ token, role }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role }));
    set({ isLoggedIn: true, token, role });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ isLoggedIn: false, role: "general", token: undefined });
  },
}));
