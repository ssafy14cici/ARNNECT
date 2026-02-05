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

const LS_KEY = "arnnect_auth";
const SS_KEY = "arnnect_auth_ss";

type StoredAuth = {
  token: string;
  role: AppRole | null;
  user: AuthUser | null;
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

  // name 없으면 nickname으로라도 채우기(안 그러면 UI/로그인 판정이 깨질 수 있음)
  const name = d.name ?? d.nickname ?? d.nickName;

  if (!memberUuid || !name) return null;
  return { memberUuid: String(memberUuid), name: String(name) };
}

function pickRole(meData: any): AppRole | null {
  const d = meData?.data ?? meData ?? {};
  return normalizeRole(d.role);
}

function clearStorage() {
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(SS_KEY);
}

function saveStorage(data: StoredAuth, remember: boolean) {
  const raw = JSON.stringify(data);

  // 한 군데만 유지
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(SS_KEY);

  if (remember) localStorage.setItem(LS_KEY, raw);
  else sessionStorage.setItem(SS_KEY, raw);
}

function loadStorage(): { data: StoredAuth; place: "local" | "session" } | null {
  const rawLocal = localStorage.getItem(LS_KEY);
  if (rawLocal) {
    const parsed = parseStored(rawLocal);
    if (parsed) return { data: parsed, place: "local" };
  }

  const rawSession = sessionStorage.getItem(SS_KEY);
  if (rawSession) {
    const parsed = parseStored(rawSession);
    if (parsed) return { data: parsed, place: "session" };
  }

  return null;
}

function overwriteSamePlace(place: "local" | "session" | null, data: StoredAuth) {
  if (!place) return;
  const raw = JSON.stringify(data);
  if (place === "local") localStorage.setItem(LS_KEY, raw);
  if (place === "session") sessionStorage.setItem(SS_KEY, raw);
}

function parseStored(raw: string): StoredAuth | null {
  try {
    const obj = JSON.parse(raw) as any;
    const token = typeof obj?.token === "string" ? obj.token : "";
    if (!token.trim()) return null;

    const role = normalizeRole(obj?.role);
    const u = obj?.user ?? null;

    const user: AuthUser | null =
      u && typeof u === "object"
        ? {
            memberUuid: typeof u.memberUuid === "string" ? u.memberUuid : "",
            name: typeof u.name === "string" ? u.name : "",
          }
        : null;

    return { token, role, user };
  } catch {
    return null;
  }
}

// ✅ StrictMode / 다중 호출 중복 방지
let hydrateInFlight = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  isLoggedIn: false,
  token: null,
  role: null,
  user: null,

  login: ({ token, role, remember = false, user }) => {
    set({ hydrated: true, isLoggedIn: true, token, role, user });
    // ✅ 새로고침 유지 핵심: 저장
    saveStorage({ token, role, user }, remember);
  },

  logout: () => {
    // ✅ 혹시 defaults로 박아둔 Authorization이 있으면 같이 제거
    delete (http.defaults.headers.common as any).Authorization;

    clearStorage();

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
      let storedPlace: "local" | "session" | null = null;

      try {
        // ✅ 0) 새로고침 직후: storage에서 먼저 복구 (제일 중요)
        const stored = loadStorage();
        if (stored?.data?.token) {
          storedPlace = stored.place;
          set({
            token: stored.data.token,
            role: stored.data.role,
            user: stored.data.user,
            isLoggedIn: true,
          });
        }

        // 1) (옵션) 쿠키 세션만으로 my 되는지 시도 (실제로는 안 될 가능성 높지만 harmless)
        try {
          const me = await http.get("/api/v1/member/my", {
            headers: { "x-skip-auth": "1" }, // 토큰 주입 스킵해서 “쿠키만” 확인
          });

          const user = pickUser(me.data);
          const role = pickRole(me.data);

          if (user) {
            set({
              hydrated: true,
              user,
              role,
              isLoggedIn: true,
            });

            // 쿠키세션이 된다면 token 없이도 로그인 유지 가능(저장은 건드리지 않음)
            return;
          }
        } catch (e: any) {
          const status = e?.response?.status;
          // 401/403이면 다음 단계로, 그 외면 위에서 저장된 토큰으로 시도해볼 가치가 있음
          if (status && status !== 401 && status !== 403) {
            // continue
          }
        }

        // 2) 저장된 token이 있으면 그걸로 my 재시도 (대부분 여기서 해결됨)
        if (get().token) {
          try {
            const meByToken = await http.get("/api/v1/member/my"); // 인터셉터가 Bearer 주입
            const user = pickUser(meByToken.data);
            const role = pickRole(meByToken.data);

            set({
              hydrated: true,
              user,
              role,
              isLoggedIn: !!(get().token && user),
            });

            // 저장된 user/role을 최신으로 갱신 (원래 저장된 위치에 덮어쓰기)
            overwriteSamePlace(storedPlace, {
              token: get().token!,
              role,
              user,
            });

            return;
          } catch (e: any) {
            const status = e?.response?.status;
            // token이 만료/무효면 refresh로 넘어감
            if (status !== 401 && status !== 403) throw e;
          }
        }

        // 3) refresh 후보 엔드포인트들 (BE에 맞는 것 1개만 남기면 됨)
        const refreshCandidates = [
          "/api/v1/auth/refresh",
          "/api/v1/auth/reissue",
          "/api/v1/auth/renew",
        ];

        let newToken: string | null = null;

        for (const url of refreshCandidates) {
          try {
            const rr = await http.post(url, null, {
              headers: { "x-skip-auth": "1" }, // refresh는 “토큰 없이” 호출
            });
            newToken = pickToken(rr.data);
            if (newToken) break;
          } catch {
            // 다음 후보로 continue
          }
        }

        if (newToken) {
          set({ token: newToken, isLoggedIn: true });
          // refresh 성공하면 토큰도 저장 갱신(저장 위치를 모르면 session에라도 넣기)
          overwriteSamePlace(storedPlace ?? "session", {
            token: newToken,
            role: get().role,
            user: get().user,
          });
        }

        // 4) 토큰 재발급 이후 my 재시도
        const me2 = await http.get("/api/v1/member/my");
        const user2 = pickUser(me2.data);
        const role2 = pickRole(me2.data);

        set({
          hydrated: true,
          user: user2,
          role: role2,
          isLoggedIn: !!(get().token && user2),
        });

        // user/role 최신화해서 저장 덮어쓰기
        if (get().token) {
          overwriteSamePlace(storedPlace ?? "session", {
            token: get().token!,
            role: role2,
            user: user2,
          });
        }
      } catch {
        // 실패 시 확정적으로 로그아웃 상태
        delete (http.defaults.headers.common as any).Authorization;
        clearStorage();

        set({
          hydrated: true,
          isLoggedIn: false,
          token: null,
          role: null,
          user: null,
        });
      } finally {
        hydrateInFlight = false;
      }
    })();
  },
}));
