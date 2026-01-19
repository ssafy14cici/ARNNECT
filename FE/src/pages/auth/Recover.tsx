import { useState } from "react";

export default function Recover() {
  const [email, setEmail] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API 연동 (비밀번호 재설정 메일 발송)
    alert(`재설정 링크를 요청했습니다: ${email}`);
  };

  return (
    <div>
      <h2>계정 복구</h2>
      <p>가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          type="email"
          required
        />
        <button type="submit">재설정 링크 보내기</button>
      </form>
    </div>
  );
}
