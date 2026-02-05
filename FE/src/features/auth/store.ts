// FE/src/features/auth/store.ts
import { create } from "zustand";
import { http } from "../../shared/api/http";

export type AppRole = "general" | "artist";
export type AuthUser = { memberUuid: string; name: string };

type AuthState = {
  hydrated: boolean;
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  user: AuthUser | null;

  // 기존 시그니처 유지(호출부 깨짐 방지)
  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;

  // 서버 세션 부트스트랩
  hydrate: () => void;
};

function normalizeRole(raw: unknown): AppRole | null {
  if (typeof raw !== "string") return null;
  const v = raw.toLowerCase();
  if (v === "artist") return "artist";
  if (v === "general" || v === "user") return "general";
  return null;
}

function pickToken(respData: any): string | null {
  // ✅ 프로젝트 응답 봉투 / 평면 응답 둘 다 커버
  return (
    respData?.data?.accessToken ??
    respData?.data?.token ??
    respData?.accessToken ??
    respData?.token ??
    null
  );
}

function pickUser(meData: any): AuthUser | null {
  const d = meData?.data ?? meData ?? {};
  const memberUuid = d.memberUuid ?? d.memberUUID ?? d.uuid ?? d.id;
  const name = d.name;

  if (!memberUuid || !name) return null;
  return { memberUuid: String(memberUuid), name: String(name) };
}

function pickRole(meData: any): AppRole | null {
  const d = meData?.data ?? meData ?? {};
  return normalizeRole(d.role);
}

// ✅ StrictMode / 다중 호출 중복 방지
let hydrateInFlight = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  isLoggedIn: false,
  token: null,
  role: null,
  user: null,

  login: ({ token, role, user }) => {
    set({ hydrated: true, isLoggedIn: true, token, role, user });
  },

  logout: () => {
    // ✅ 혹시 defaults로 박아둔 Authorization이 있으면 같이 제거
    delete (http.defaults.headers.common as any).Authorization;

    set({
      hydrated: true,
      isLoggedIn: false,
      token: null,
      role: null,
      user: null,
    });
  },

  hydrate: () => {
    // 이미 끝났으면 재호출 불필요
    if (get().hydrated) return;
    // 중복 부트스트랩 방지
    if (hydrateInFlight) return;
    hydrateInFlight = true;

    void (async () => {
      try {
        // 1) 쿠키 세션만으로 my가 되는지 먼저 시도
        try {
          const me = await http.get("/api/v1/member/my", {
            headers: { "x-skip-auth": "1" }, // ✅ 토큰이 있어도 여기선 스킵해도 됨
          });

          const user = pickUser(me.data);
          const role = pickRole(me.data);

          set({
            hydrated: true,
            user,
            role,
            // user가 있으면 로그인 상태로 간주(쿠키 세션형)
            isLoggedIn: !!user || !!get().token,
          });

          hydrateInFlight = false;
          return;
        } catch (e: any) {
          const status = e?.response?.status;
          // 401/403이면 refresh로 넘어감, 그 외면 실패로 처리
          if (status !== 401 && status !== 403) throw e;
        }

        // 2) refresh 후보 엔드포인트들 (프로젝트 BE에 맞는 것 1개만 남기면 됨)
        const refreshCandidates = [
          "/api/v1/auth/refresh",
          "/api/v1/auth/reissue",
          "/api/v1/auth/renew",
        ];

        let newToken: string | null = null;

        for (const url of refreshCandidates) {
          try {
            const rr = await http.post(
              url,
              null,
              { headers: { "x-skip-auth": "1" } } // ✅ refresh는 토큰 없이 호출
            );
            newToken = pickToken(rr.data);
            if (newToken) break;
          } catch {
            // 다음 후보로 continue
          }
        }

        if (newToken) {
          set({ token: newToken, isLoggedIn: true });
        }

        // 3) 토큰 재발급 이후 my 재시도 (토큰이 없어도 쿠키 세션이면 될 수 있음)
        const me2 = await http.get("/api/v1/member/my");
        const user2 = pickUser(me2.data);
        const role2 = pickRole(me2.data);

        set({
          hydrated: true,
          user: user2,
          role: role2,
          isLoggedIn: !!(get().token || user2),
        });

        hydrateInFlight = false;
      } catch {
        // 실패 시 확정적으로 로그아웃 상태
        delete (http.defaults.headers.common as any).Authorization;

        set({
          hydrated: true,
          isLoggedIn: false,
          token: null,
          role: null,
          user: null,
        });

        hydrateInFlight = false;
      }
    })();
  },
}));
