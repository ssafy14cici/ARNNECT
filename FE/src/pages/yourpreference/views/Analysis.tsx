import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadSession } from "../store/session";
import "../yourtaste.css";

export default function Analysis() {
  const nav = useNavigate();
  const session = loadSession();

  useEffect(() => {
    if (!session) {
      nav("/yourtaste");
      return;
    }
    // 로딩 연출용
    const t = setTimeout(() => nav("/yourtaste/result"), 900);
    return () => clearTimeout(t);
  }, [nav, session]);

  return (
    <main className="btPage">
      <section className="btPanel">
        <h2 className="btTitle">분석 중…</h2>
        <p className="btDesc">선택 패턴을 기반으로 취향을 계산하고 있어요.</p>
        <div className="btLoader" />
      </section>
    </main>
  );
}
