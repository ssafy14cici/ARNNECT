// src/pages/auth/_utils/emailDupCheck.ts
import { apiCheckEmailDup } from "../../../api/auth";

// UI에서 쓰기 편한 형태로 래핑
export type EmailDupCheckResult = {
  ok: boolean;        // true = 사용 가능
  message: string;    // UI 표시용 메시지
};

export async function checkEmailDupMock(email: string): Promise<EmailDupCheckResult> {
  const e = email.trim();

  // 1차 프론트 가드(불필요 호출 방지)
  if (!e) {
    return { ok: false, message: "이메일을 입력해주세요." };
  }
  if (!e.includes("@")) {
    return { ok: false, message: "이메일 형식을 확인해주세요." };
  }

  // 서버(=mock api) 체크
  const r = await apiCheckEmailDup(e);

  return {
    ok: r.available,
    message: r.reason ?? (r.available ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다."),
  };
}
