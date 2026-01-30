// src/pages/auth/utils/validation.ts
import type { ArtistStep2 } from "../../../features/auth/types"; // 경로는 유저 폴더 구조에 맞춰 조정
// ↑ 현재 파일이 /pages/auth/utils/validation.ts 이므로
//    /src/types/auth.ts 까지 상대경로: ../../.. /types/auth

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

export type AccountStepValue = {
  email: string;
  name: string;
  password: string;
  phone: string;
};

export function maskPw(pw: string) {
  if (!pw) return "—";
  const n = Math.min(pw.length, 12);
  return "•".repeat(n) + (pw.length > 12 ? "…" : "");
}

export function validateAccountStep(args: {
  v: AccountStepValue;
  password2: string;
  emailChecked: boolean;
}) {
  const { v, password2, emailChecked } = args;

  if (!isValidEmail(v.email))
    return "이메일 형식을 확인해주세요. (예: example@email.com)";
  if (!emailChecked) return "이메일 중복 확인을 완료해주세요.";
  if (!v.name.trim()) return "이름을 입력해주세요.";
  if (v.password.trim().length < 8)
    return "비밀번호는 8자 이상으로 입력해주세요.";
  if (v.password !== password2) return "비밀번호 확인이 일치하지 않습니다.";
  if (!v.phone.trim()) return "전화번호를 입력해주세요.";
  return null;
}

export function validateArtistStep2(v: ArtistStep2) {
  if (!v.displayName.trim()) return "성명(활동명)을 입력해주세요.";
  if (!v.artMain) return "예술활동분야(대분류)를 선택해주세요.";
  if (!v.artSub) return "예술활동분야(소분류)를 선택해주세요.";
  if (!v.birthYear) return "출생연도를 선택해주세요.";

  // ✅ 예술활동 증명: YES일 때만 파일 필요
  if (v.verified === "YES" && !v.verifiedFile) {
    return "예술활동증명 파일을 첨부해주세요.";
  }

  return null;
}

export function validateArtistStep3(
  a3: {
    portfolioFile: File | null;
  },
  opts?: { portfolioRequired?: boolean },
) {
  const portfolioRequired = opts?.portfolioRequired ?? true;
  if (portfolioRequired && !a3.portfolioFile)
    return "포트폴리오 파일을 첨부해주세요.";
  return null;
}

export function validateConsent(consented: boolean) {
  if (!consented) return "개인정보 수집·이용 동의가 필요합니다.";
  return null;
}
