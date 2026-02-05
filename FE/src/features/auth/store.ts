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

  login: (p: { token: string; role: AppRole; remember?: boolean; user: AuthUser }) => void;
  logout: () => void;
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

function roleFromToken(token: string | null): AppRole | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as any;

    return normalizeRole(payload?.role);
  } catch {
    return null;
  }
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

function pickUser(meData: any): AuthUser | null {
  const d = meData?.data ?? meData ?? {};
  const memberUuid = d.memberUuid ?? d.memberUUID ?? d.uuid ?? d.id;
  const name = d.name ?? d.nickname ?? d.nickName ?? d.email;

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
      u && typeof u === "object" && typeof (u.memberUuid ?? u.memberUUID) === "string"
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

// ✅ 핵심: 토큰을 “직접” Authorization에 넣어서 /member/my를 호출
async function fetchMyWithToken(token: string) {
  return http.get("/api/v1/member/my", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

let hydrateInFlight = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  isLoggedIn: false,
  token: null,
  role: null,
  user: null,

  login: ({ token, role, remember = false, user }) => {
    set({ hydrated: true, isLoggedIn: true, token, role, user });
    saveStorage({ token, role, user }, remember);
  },

  logout: () => {
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
        // 0) storage 복구
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

        const token = get().token;

        // 1) ✅ token 있으면 my를 “직접 Bearer”로 확정 (여기서 성공하면 refresh로 절대 안 감)
        if (token) {
          try {
            const me = await fetchMyWithToken(token);
            const user = pickUser(me.data);
            const roleFromMy = pickRole(me.data);

            if (!user) throw new Error("my 응답에서 memberUuid 없음");

            const role =
              roleFromMy ?? roleFromToken(token) ?? get().role ?? stored?.data.role ?? null;

            set({ hydrated: true, user, role, isLoggedIn: true });
            overwriteSamePlace(storedPlace, { token, role, user });
            return;
          } catch (e: any) {
            const status = e?.response?.status;
            if (status !== 401 && status !== 403) throw e;
            // 401/403이면 refresh 시도(있다면)
          }
        }

        // 2) refresh 후보 (현재 유저 스샷에서는 403이라 여기서 죽고 catch로 감)
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

        set({ token: newToken, isLoggedIn: true });

        // 3) refresh 후 my도 “직접 Bearer”
        const me2 = await fetchMyWithToken(newToken);
        const user2 = pickUser(me2.data);
        const roleFromMy2 = pickRole(me2.data);

        if (!user2) throw new Error("my 응답에서 memberUuid 없음(2)");

        const role2 =
          roleFromMy2 ?? roleFromToken(newToken) ?? get().role ?? stored?.data.role ?? null;

        set({ hydrated: true, user: user2, role: role2, isLoggedIn: true });
        overwriteSamePlace(storedPlace ?? "session", { token: newToken, role: role2, user: user2 });
      } catch {
        // ✅ 여기서 바로 storage를 지워버리니까 “로그인 풀림”처럼 보임
        // refresh가 403인 상태면 결국 여기로 오게 되어 있음
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
