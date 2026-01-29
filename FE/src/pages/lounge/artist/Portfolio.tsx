import { Link } from "react-router-dom";
import "../lounge.css";

export default function Portfolio() {
  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">포트폴리오</h1>
          <Link className="loungeBackLink" to="/lounge">← 라운지로</Link>
        </div>

        <p className="loungeSubDesc">
          등록된 작품은 <strong>내 프로필</strong>의 포트폴리오 탭에 공개됩니다.
        </p>

        {/* Empty State (with premium look) */}
        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">작품 관리</h2>
          <div className="loungeEmpty">
            아직 등록된 작품이 없습니다.<br />
            당신의 첫 번째 작품을 등록해보세요.
          </div>

          <div className="loungeSubActions" style={{ justifyContent: 'center' }}>
            {/* 실제로는 /posts/create/artist로 이동하게 됨 */}
            <Link to="/posts/create" className="loungeSubBtn" style={{ textDecoration: 'none' }}>
              + 새 작품 등록
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}