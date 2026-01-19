import { create } from "zustand";
import type { Role } from "../router/guards";

type AuthState = {
  isLoggedIn: boolean;
  role: Role;
  token?: string;

  // demo actions
  loginAsGeneral: () => void;
  loginAsArtist: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: "general",
  token: undefined,

  loginAsGeneral: () => set({ isLoggedIn: true, role: "general", token: "demo" }),
  loginAsArtist: () => set({ isLoggedIn: true, role: "artist", token: "demo" }),
  logout: () => set({ isLoggedIn: false, role: "general", token: undefined }),
}));
