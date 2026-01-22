// FE/src/pages/lounge/artist/Portfolio.tsx
import { Link } from "react-router-dom";
import "../lounge.css";

export default function Portfolio() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">포트폴리오</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>
        <p className="loungeSubDesc">
          내 작품/작업물을 관리하고 노출할 수 있는 공간입니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">MVP</h2>
          <p className="loungeSubHint">
            - 작품 리스트(카드)<br />
            - 작품 추가/수정/삭제<br />
            - (추후) 대표작 설정/정렬/태그
          </p>

          <div className="loungeEmpty">등록된 작품이 없습니다.</div>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button">
              작품 추가(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
