// FE/src/features/auth/authMock.ts
// ✅ legacy shim: 기존 코드가 import 하고 있을 수 있어서 남김
import type { UserRole } from "./types";
import { apiLogin } from "./api"; // 결국 mock 모드면 localStorage로 돌아감

export function seedMockAccounts() {
  // 이제는 api/mock.ts 내부 seedMockUsers가 책임짐
  // 필요하면 여기서 한 번 호출해도 됨(로그인 호출하면 자동 seed)
}

export async function mockLogin(payload: {
  email: string;
  password: string;
  role: UserRole;
  remember?: boolean;
}) {
  return apiLogin(payload);
}
