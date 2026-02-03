// FE/src/features/auth/api/index.ts
import type { EmailDupCheckResult } from "../types";
import { USE_MOCK } from "../../../shared/config/env";

import { signupUserMock, signupArtistMock, loginMock, checkEmailDupMock } from "./mock";
import { signupUserReal, signupArtistReal, loginReal, checkEmailDupReal } from "./real";

export const apiSignupUser = USE_MOCK ? signupUserMock : signupUserReal;
export const apiSignupArtist = USE_MOCK ? signupArtistMock : signupArtistReal;
export const apiLogin = USE_MOCK ? loginMock : loginReal;

export async function apiCheckEmailDup(email: string): Promise<EmailDupCheckResult> {
  if (USE_MOCK) {
    const r = await checkEmailDupMock(email);
    return { ok: !!r.available, message: r.reason ?? (r.available ? "사용 가능" : "사용 불가") };
  }
  const r = await checkEmailDupReal(email);
  return { ok: r.ok, message: r.message };
}

