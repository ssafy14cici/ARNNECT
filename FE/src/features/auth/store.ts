// FE/src/features/auth/store.ts
import { create } from "zustand";
import { http, bindAuthTokenGetter } from "../../shared/api/http";

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
  if (v.includes("artist")) return "artist";
  if (v.includes("general") || v.includes("user")) return "general";
  return null;
}

function pickToken(respData: any): string | null {
  return (
    respData?.data?.accessToken ??
    respData?.data?.token ??
    respData?.accessToken ??
    respData?.token ??
    null
  );
}

// ⚠️ name이 안 오면 user를 null로 만들면 “로그인 풀림처럼” 보임 → fallback 필수
function pickUser(meData: any): AuthUser | null {
  const d = meData?.data ?? meData ?? {};
  const memberUuid = d.memberUuid ?? d.memberUUID ?? d.uuid ?? d.id;
  const name = d.name ?? d.nickname ?? d.nickName ?? d.email; // ✅ fallback

  if (!memberUuid) return null;
  return { memberUuid: String(memberUuid), name: name ? String(name) : "" };
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

  // 한 군데만 남기기
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(SS_KEY);

  if (remember) localStorage.setItem(LS_KEY, raw);
  else sessionStorage.setItem(SS_KEY, raw);
}

function parseStored(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as any;
    const token = typeof obj?.token === "string" ? obj.token : "";
    if (!token.trim()) return null;

    const role = normalizeRole(obj?.role);
    const u = obj?.user;

    const user: AuthUser | null =
      u && typeof u === "object" && (typeof u.memberUuid === "string" || typeof u.memberUUID === "string")
        ? {
            memberUuid: String(u.memberUuid ?? u.memberUUID ?? ""),
            name: typeof u.name === "string" ? u.name : "",
          }
        : null;

    return { token, role, user };
  } catch {
    return null;
  }
}

function loadStorage(): { data: StoredAuth; place: "local" | "session" } | null {
  const a = parseStored(localStorage.getItem(LS_KEY));
  if (a) return { data: a, place: "local" };

  const b = parseStored(sessionStorage.getItem(SS_KEY));
  if (b) return { data: b, place: "session" };

  return null;
}

function overwriteSamePlace(place: "local" | "session" | null, data: StoredAuth) {
  if (!place) return;
  const raw = JSON.stringify(data);
  if (place === "local") localStorage.setItem(LS_KEY, raw);
  else sessionStorage.setItem(SS_KEY, raw);
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
    // ✅ 새로고침 유지 핵심
    saveStorage({ token, role, user }, remember);
  },

  logout: () => {
    // (지금은 인터셉터가 getToken으로 붙이니까 defaults 삭제는 필수 아님. 있어도 무방)
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
    if (get().hydrated) return;
    if (hydrateInFlight) return;
    hydrateInFlight = true;

    void (async () => {
      let storedPlace: "local" | "session" | null = null;

      try {
        // 0) ✅ 새로고침 직후: storage에서 먼저 복구
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

        // 1) ✅ token이 있으면 그걸로 /member/my 먼저 확정
        if (get().token) {
          try {
            const me = await http.get("/api/v1/member/my");
            const user = pickUser(me.data);
            const role = pickRole(me.data);

            if (!user) throw new Error("my 응답에서 memberUuid를 못 찾음");

            set({
              hydrated: true,
              user,
              role,
              isLoggedIn: true,
            });

            overwriteSamePlace(storedPlace, { token: get().token!, role, user });
            return;
          } catch (e: any) {
            const status = e?.response?.status;
            if (status !== 401 && status !== 403) throw e;
          }
        }

        // 2) refresh 후보 (BE에 실제로 있으면 여기서 살아남)
        const refreshCandidates = ["/api/v1/auth/refresh", "/api/v1/auth/reissue", "/api/v1/auth/renew"];

        let newToken: string | null = null;
        for (const url of refreshCandidates) {
          try {
            const rr = await http.post(url, null, { headers: { "x-skip-auth": "1" } });
            newToken = pickToken(rr.data);
            if (newToken) break;
          } catch {
            // continue
          }
        }

        if (!newToken) throw new Error("refresh 실패");

        set({ token: newToken });

        // 3) refresh 후 my 재시도
        const me2 = await http.get("/api/v1/member/my");
        const user2 = pickUser(me2.data);
        const role2 = pickRole(me2.data);

        if (!user2) throw new Error("my 응답에서 memberUuid를 못 찾음(2)");

        set({
          hydrated: true,
          user: user2,
          role: role2,
          isLoggedIn: true,
        });

        overwriteSamePlace(storedPlace ?? "session", { token: newToken, role: role2, user: user2 });
      } catch {
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

// ✅ 순환 의존성 끊기: http 인터셉터가 토큰을 store에서 가져가도록 “주입”
bindAuthTokenGetter(() => useAuthStore.getState().token);
