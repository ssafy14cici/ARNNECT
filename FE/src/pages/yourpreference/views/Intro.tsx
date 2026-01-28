import { useNavigate } from "react-router-dom";
import { createSession, saveSession, clearSession } from "../store/session";
import "../yourtaste.css";

export default function Intro() {
  const nav = useNavigate();

  const start = () => {
    clearSession();
    const s = createSession(8); // 라운드 수는 마음대로
    saveSession(s);
    nav("/yourtaste/battle");
  };

  return (
    <main className="btPage">
      <section className="btPanel">
        <h1 className="btTitle">블라인드 취향 분석</h1>
        <p className="btDesc">
          작품명/장르 없이 그림만 보고 선택합니다. <br />
          선택 패턴으로 취향을 추정해요.
        </p>

        <button className="btBtnPrimary" onClick={start} type="button">
          시작하기
        </button>
      </section>
    </main>
  );
}
