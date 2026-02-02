// FE/src/features/auth/api/index.ts
import type { EmailDupCheckResult } from "../types";

import { signupUserMock, signupArtistMock, loginMock, checkEmailDupMock } from "./mock";
import { signupUserReal, signupArtistReal, loginReal, checkEmailDupReal } from "./real";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === "true";

export const apiSignupUser = USE_MOCK ? signupUserMock : signupUserReal;
export const apiSignupArtist = USE_MOCK ? signupArtistMock : signupArtistReal;
export const apiLogin = USE_MOCK ? loginMock : loginReal;

/** ✅ UI가 기대하는 { ok, message }로 통일 */
// FE/src/features/auth/api/index.ts
export async function apiCheckEmailDup(email: string): Promise<EmailDupCheckResult> {
  if (USE_MOCK) {
    const r = await checkEmailDupMock(email);
    return { ok: !!r.available, message: r.reason ?? (r.available ? "사용 가능" : "사용 불가") };
  }
  const r = await checkEmailDupReal(email);
  return { ok: r.ok, message: r.message };
}

