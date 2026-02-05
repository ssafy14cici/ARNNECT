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
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
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

      // ✅ 0) storage에서 일단 복구 + 즉시 hydrated true로 “로그인 유지”
      const stored = loadStorage();
      if (stored?.data?.token) {
        storedPlace = stored.place;

        const token = stored.data.token;
        const role = stored.data.role ?? roleFromToken(token);
        const user = stored.data.user;

        set({
          hydrated: true,     // ✅ 여기서 이미 true
          token,
          role,
          user,
          isLoggedIn: true,   // ✅ token 있으면 로그인으로 취급
        });
      } else {
        // 저장값이 없으면 그냥 hydrated만 true
        set({ hydrated: true, isLoggedIn: false });
      }

      try {
        const token = get().token;
        if (!token) return;

        // ✅ 1) my로 user/role 최신화 시도 (실패해도 “로그아웃 확정” 금지)
        const me = await fetchMyWithToken(token);
        const user = pickUser(me.data);

        // role이 my에 없으면 토큰/기존값 유지
        const role =
          pickRole(me.data) ?? roleFromToken(token) ?? get().role ?? stored?.data.role ?? null;

        if (user) {
          set({ user, role, isLoggedIn: true });
          overwriteSamePlace(storedPlace, { token, role, user });
        } else {
          // memberUuid 못 뽑아도 로그아웃 확정 안 함(저장된 user 유지)
          set({ role, isLoggedIn: true });
          overwriteSamePlace(storedPlace, { token, role, user: get().user });
        }

        return;
      } catch (e: any) {
        // ✅ 여기서 핵심: 실패해도 storage를 지우지 않는다
        // refresh 403이든, my 401이든 “일단 로그인 유지” 상태로 둔다
        // (토큰이 진짜 만료면 이후 API에서 401 나오고 그때 재로그인 UX로 처리)
      } finally {
        hydrateInFlight = false;
      }
    })();
  },
}));

// ✅ http 인터셉터에 token 공급 (순환 방지)
bindAuthTokenGetter(() => useAuthStore.getState().token);
