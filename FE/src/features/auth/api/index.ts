// FE/src/features/auth/api/index.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
} from "../types";

import {
  checkEmailDupMock,
  loginMock,
  signupArtistMock,
  signupUserMock,
} from "./mock";

import {
  checkEmailDupReal,
  loginReal,
  signupArtistReal,
  signupUserReal,
} from "./real";

// ✅ mock 모드: .env.development에 VITE_USE_MOCK=true 로 고정 추천
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

export async function apiCheckEmailDup(email: string) {
  return USE_MOCK ? checkEmailDupMock(email) : checkEmailDupReal(email);
}

export async function apiSignupUser(payload: SignupUserRequest) {
  return USE_MOCK ? signupUserMock(payload) : signupUserReal(payload);
}

export async function apiSignupArtist(payload: SignupArtistRequest) {
  return USE_MOCK ? signupArtistMock(payload) : signupArtistReal(payload);
}

export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  return USE_MOCK ? loginMock(payload) : loginReal(payload);
}
