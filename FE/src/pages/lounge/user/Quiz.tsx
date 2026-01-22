// FE/src/pages/lounge/user/Quiz.tsx
import { Link } from "react-router-dom";
import "../lounge.css";

export default function Quiz() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">퀴즈</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>
        <p className="loungeSubDesc">
          작품/작가 기반 퀴즈를 통해 재미 요소를 제공합니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">MVP</h2>
          <p className="loungeSubHint">
            - 퀴즈 시작 버튼<br />
            - 문제/선택지/정답 처리<br />
            - (추후) 기록/랭킹/배지
          </p>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button">
              퀴즈 시작(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
