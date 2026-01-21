// src/pages/auth/utils/emailDupCheck.ts
export async function checkEmailDupMock(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const v = email.trim().toLowerCase();

  // UX용 딜레이
  await new Promise((r) => setTimeout(r, 350));

  // 목업 중복 리스트(원하면 늘리기)
  const TAKEN = new Set([
    "test@example.com",
    "admin@example.com",
    "artist@example.com",
  ]);

  if (TAKEN.has(v)) {
    return { ok: false, message: "이미 사용 중인 이메일입니다." };
  }
  return { ok: true, message: "사용 가능한 이메일입니다." };
}
