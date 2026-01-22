// FE/src/pages/lounge/artist/FanLetter.tsx
import { Link } from "react-router-dom";
import "../lounge.css";

export default function FanLetter() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">팬레터 · QnA</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>
        <p className="loungeSubDesc">
          팬 질문을 확인하고 답변을 관리합니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">MVP</h2>
          <p className="loungeSubHint">
            - 질문 리스트(미답변 우선)<br />
            - 질문 상세/답변 작성<br />
            - (추후) 답변 템플릿/검색/필터
          </p>

          <div className="loungeEmpty">도착한 질문이 없습니다.</div>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button">
              새로고침(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
