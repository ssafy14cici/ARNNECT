import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    // TODO: API 붙이면 여기서 회원가입 요청
    alert("회원가입 완료! 로그인 해주세요.");
    nav("/login");
  };

  return (
    <div>
      <h2>Signup</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required />
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" type="password" required />
        <input value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="비밀번호 확인" type="password" required />
        <button type="submit">회원가입</button>

        <div style={{ fontSize: 14 }}>
          <Link to="/login">로그인으로</Link>
        </div>
      </form>
    </div>
  );
}
