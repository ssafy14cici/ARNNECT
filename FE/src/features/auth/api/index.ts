// FE/src/features/auth/api/index.ts
import type { EmailDupCheckResult } from "../types";
import { signupUserReal, signupArtistReal, loginReal, checkEmailDupReal } from "./real";

export const apiSignupUser = signupUserReal;
export const apiSignupArtist = signupArtistReal;
export const apiLogin = loginReal;

export async function apiCheckEmailDup(email: string): Promise<EmailDupCheckResult> {
  const r = await checkEmailDupReal(email);
  return { ok: r.ok, message: r.message };
}
