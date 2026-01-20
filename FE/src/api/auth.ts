// src/api/auth.ts
import type {
  LoginRequest,
  LoginResponse,
  SignupArtistRequest,
  SignupUserRequest,
} from "@/types/auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  await sleep(250);

  if (!payload.email.includes("@") || !payload.password) {
    throw new Error("이메일 또는 비밀번호를 확인해주세요.");
  }

  return {
    token: `mock_${payload.role}_${Date.now()}`,
    email: payload.email,
    role: payload.role,
  };
}

export async function apiSignupUser(payload: SignupUserRequest): Promise<void> {
  await sleep(300);

  if (payload.password.length < 8) throw new Error("비밀번호는 8자 이상 입력해주세요.");
  if (payload.password !== payload.passwordConfirm) throw new Error("비밀번호 확인이 일치하지 않습니다.");
  if (!payload.agreements.terms || !payload.agreements.privacy) {
    throw new Error("필수 약관에 동의해주세요.");
  }
}

export async function apiSignupArtist(payload: SignupArtistRequest): Promise<void> {
  await sleep(350);

  if (!payload.email.includes("@")) throw new Error("이메일을 확인해주세요.");
  if (!payload.displayName) throw new Error("성명(활동명)을 입력해주세요.");
  if (!payload.artMain || !payload.artSub) throw new Error("예술활동분야를 선택해주세요.");
  if (!payload.intro) throw new Error("예술활동 소개를 입력해주세요.");
  if (!payload.profileImage) throw new Error("프로필 이미지를 업로드해주세요.");
  if (!payload.portfolioFile) throw new Error("포트폴리오 파일을 업로드해주세요.");
  if (!payload.privacyConsent) throw new Error("개인정보 수집·이용에 동의해주세요.");
}
