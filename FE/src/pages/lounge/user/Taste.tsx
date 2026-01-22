// FE/src/pages/lounge/user/Taste.tsx
import { Link } from "react-router-dom";
import "../lounge.css";

export default function Taste() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">취향분석</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>
        <p className="loungeSubDesc">
          활동(좋아요/조회/스캔 등)을 기반으로 취향을 요약합니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">MVP</h2>
          <p className="loungeSubHint">
            - 선호 장르/태그 Top N<br />
            - 선호 작가 Top N<br />
            - (추후) 레이더/막대 차트, 추천 연결
          </p>

          <div className="loungeEmpty">분석 데이터가 없습니다.</div>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button">
              분석 갱신(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
