// FE/src/pages/lounge/user/CollectBook.tsx
import { Link } from "react-router-dom";
import "../lounge.css";

export default function CollectBook() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">컬렉트북</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">
          스캔/등록된 티켓(전시)을 모아 보는 공간입니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">MVP</h2>
          <p className="loungeSubHint">
            - 티켓 목록(최근 스캔 순)
            <br />
            - 티켓 상세 이동
            <br />
            - (추후) 티켓 등록/삭제, 필터(작가/태그)
          </p>

          <div className="loungeEmpty">아직 등록된 티켓이 없습니다.</div>

          <div className="loungeSubActions">
            {/* ✅ 스캔 페이지로 이동 */}
            <Link className="loungeSubBtn" to="/lounge/collectbook/scan">
              티켓 스캔
            </Link>

            {/* ✅ MVP: 추후 목록 API 붙일 자리 */}
            <button className="loungeSubBtn" type="button" disabled>
              목록 새로고침(준비중)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
