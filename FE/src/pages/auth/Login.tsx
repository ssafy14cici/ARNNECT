import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { Role } from "../../router/guards";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = useMemo(() => loc.state?.from ?? "/", [loc.state]);

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

    nav(from, { replace: true });
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

        <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
          <Link to="/signup">회원가입</Link>
          <Link to="/recover">계정복구</Link>
        </div>
      </form>
    </div>
  );
}
