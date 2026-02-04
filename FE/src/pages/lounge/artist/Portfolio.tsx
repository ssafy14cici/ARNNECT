import { Link, useNavigate } from "react-router-dom";
import "../lounge.css";

export default function Portfolio() {
  const nav = useNavigate();

  const goExhibit = () => {
    // ✅ 공용 전시장(/exhibit)로 이동
    // 필요하면 state로 "어디서 왔는지" 정도만 넘겨두면 디버깅이 편함
    nav("/exhibit", { state: { from: "lounge-portfolio" } });
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">포트폴리오</h1>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* ✅ 전시장 바로가기 버튼 */}
            <button
              type="button"
              className="loungeSubBtn"
              onClick={goExhibit}
              style={{ textDecoration: "none" }}
            >
              전시장 바로가기
            </button>

            <Link className="loungeBackLink" to="/lounge">
              ← 라운지로
            </Link>
          </div>
        </div>

        <p className="loungeSubDesc">
          등록된 작품은 <strong>내 프로필</strong>의 포트폴리오 탭에 공개됩니다.
        </p>

        {/* Empty State */}
        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">작품 관리</h2>
          <div className="loungeEmpty">
            아직 등록된 작품이 없습니다.
            <br />
            당신의 첫 번째 작품을 등록해보세요.
          </div>

          <div className="loungeSubActions" style={{ justifyContent: "center" }}>
            {/* ✅ posts/create는 지금 리다이렉트 로직도 섞여있어서 혼란 원인
                작가 작품 등록은 라우터 기준 /artworks/create 로 고정 추천 */}
            <Link
              to="/artworks/create"
              className="loungeSubBtn"
              style={{ textDecoration: "none" }}
            >
              + 새 작품 등록
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
