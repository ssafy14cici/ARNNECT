// import { useMemo, useState } from "react";
// import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
// import { useAuthStore } from "../../stores/authStore";
// import type { Role } from "../../router/guards";

// export default function Login() {
//   const nav = useNavigate();
//   const loc = useLocation() as any;
//   const from = useMemo(() => loc.state?.from ?? "/", [loc.state]);

//   const login = useAuthStore((s) => s.login);

//   const [email, setEmail] = useState("");
//   const [pw, setPw] = useState("");
//   const [role, setRole] = useState<Role>("general");

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     // TODO: API 붙이면 여기서 로그인 요청
//     // 지금은 mock token 발급
//     const token = `demo_${Date.now()}`;
//     login({ token, role });

//     nav(from, { replace: true });
//   };

//   return (
//     <div>
//       <h2>Login</h2>

//       <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
//         <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required />
//         <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" type="password" required />

//         <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
//           <span>역할</span>
//           <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
//             <option value="general">일반 유저</option>
//             <option value="artist">예술가</option>
//           </select>
//         </label>

//         <button type="submit">로그인</button>

//         <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
//           <Link to="/signup">회원가입</Link>
//           <Link to="/recover">계정복구</Link>
//         </div>
//       </form>
//     </div>
//   );
// }

import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { Role } from "../../router/guards";

export default function Login() {
  const nav = useNavigate();

  /**
   * ✅ (1) returnUrl을 "쿼리스트링"에서 먼저 읽는다.
   *
   * 이유:
   * - Guard를 /login?returnUrl=... 형태로 바꿨기 때문.
   * - 쿼리스트링은 URL에 포함되어 있으므로
   *   새로고침/직접입력/공유링크에서도 복귀 정보가 절대 사라지지 않는다.
   */
  const [params] = useSearchParams();

  /**
   * ✅ (2) 기존 방식(state.from)도 fallback으로 유지한다.
   *
   * 이유:
   * - 앱의 다른 코드(또는 과거 코드)가 아직
   *   Navigate state={{ from: ... }} 방식으로 보내는 경우가 있을 수 있음.
   * - 둘 다 지원하면 전환 과정에서 오류 없이 안정적.
   */
  const loc = useLocation() as any;

  /**
   * ✅ (3) 최종 복귀 경로(from) 결정 로직
   *
   * 우선순위:
   *  1) query returnUrl (Guard에서 넣어주는 값)
   *  2) location.state.from (예전 방식)
   *  3) "/" (어디에도 없으면 홈)
   *
   * decodeURIComponent를 쓰는 이유:
   * - Guard에서 encodeURIComponent로 인코딩해서 넘기므로
   *   여기서 다시 디코딩해서 원래 URL로 복구해야 한다.
   */
  const from = useMemo(() => {
    const raw = params.get("returnUrl");
    if (raw) {
      try {
        return decodeURIComponent(raw);
      } catch {
        // 인코딩이 깨진 경우라도 로그인 후 홈으로는 갈 수 있게 안전장치
        return "/";
      }
    }
    return loc.state?.from ?? "/";
  }, [params, loc.state]);

  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState<Role>("general");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: API 붙이면 여기서 로그인 요청
    // 지금은 mock token 발급
    const token = `demo_${Date.now()}`;
    login({ token, role });
    console.log("after login:", useAuthStore.getState());

    /**
     * ✅ (4) 로그인 성공 후 원래 가려던 페이지로 복귀
     *
     * replace: true 이유:
     * - 로그인 페이지가 히스토리에 남지 않도록 함
     * - 사용자가 뒤로가기 눌렀을 때 다시 /login으로 돌아오는 UX를 줄임
     */
    nav(from, { replace: true });
    console.log("LOGIN DONE. return to:", from);

  };

  return (
    <div>
      <h2>Login</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required />
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" type="password" required />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>역할</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="general">일반 유저</option>
            <option value="artist">예술가</option>
          </select>
        </label>

        <button type="submit">로그인</button>
        <button
          type="button"
          onClick={() => {
            const token = `demo_${Date.now()}`;
            login({ token, role: "general" });
            nav(from, { replace: true });
          }}
        >
          Demo Login(테스트용)
        </button>

        <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
          <Link to="/signup">회원가입</Link>
          <Link to="/recover">계정복구</Link>
        </div>
      </form>
    </div>
  );
}
