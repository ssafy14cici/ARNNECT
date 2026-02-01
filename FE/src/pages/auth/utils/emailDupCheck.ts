// FE/src/pages/auth/utils/emailDupCheck.ts
import { apiCheckEmailDup } from "../../../features/auth/api";

/**
 * 기존 pages 코드 호환을 위해 이름은 그대로 유지(checkEmailDupMock).
 * 내부는 features/auth/apiCheckEmailDup로 연결되어 mock/real 자동 분기됨.
 */
export async function checkEmailDup(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const e = email.trim();
  if (!e) return { ok: false, message: "이메일을 입력해주세요." };

  try {
    const { available, reason } = await apiCheckEmailDup(e);
    return {
      ok: available,
      message: reason ?? (available ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다."),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "이메일 확인에 실패했습니다.";
    return { ok: false, message: msg };
  }
}

// ✅ 기존 코드(import { checkEmailDupMock } ...) 그대로 살리기 위한 alias
export const checkEmailDupMock = checkEmailDup;
