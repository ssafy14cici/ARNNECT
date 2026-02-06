// FE/src/pages/lounge/artist/Portfolio.tsx

import { Link, useNavigate } from "react-router-dom";
import "../lounge.css";

// ✅ AuthStore에서 내 memberUuid 가져오기
import { useAuthStore } from "../../../features/auth/store";

export default function Portfolio() {
  const nav = useNavigate();

  // ✅ (중요) 여기 user 구조가 다르면 필드명만 맞춰줘
  // 예: s.user?.memberUuid, s.user?.member_id, s.user?.uuid ...
  const myUuid = useAuthStore((s) => s.user?.memberUuid);
  const myNickname = useAuthStore((s) => s.user?.nickname ?? "");

  const goExhibit = () => {
    // ✅ /exhibit/:artistId 라우트가 필수라서 반드시 uuid 붙여야 함
    if (!myUuid) {
      console.warn("[Portfolio] myUuid is missing. Check auth store user shape.");
      // 필요하면 토스트/알럿 처리
      return;
    }

    nav(`/exhibit/${myUuid}`, {
      state: {
        from: "lounge-portfolio",
        artist: myNickname,
        artworkTitle: "PORTFOLIO",
        fromWaypointId: 0,
      },
    });
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
            {/* ✅ 작가 작품 등록 라우트 고정 */}
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
