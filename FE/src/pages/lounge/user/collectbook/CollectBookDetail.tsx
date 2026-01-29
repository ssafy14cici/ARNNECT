// FE/src/pages/lounge/user/CollectBookDetail.tsx
import { Link, useParams } from "react-router-dom";
import "../../lounge.css";
import TicketCardModern from "./TicketCardModern";
import "./ticketCardModern.css";

import { getCollectBookItemById } from "../../../../features/collectbook/storage";

export default function CollectBookDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <main className="loungePage">
        <section className="loungeWrap">
          <div className="loungeSubTop">
            <h1 className="loungeSubTitle">티켓 상세</h1>
            <Link className="loungeBackLink" to="/lounge/collectbook">
              ← 컬렉트북으로
            </Link>
          </div>

          <div className="loungeSubPanel">
            <p className="loungeSubHint">잘못된 접근입니다. (id 없음)</p>
          </div>
        </section>
      </main>
    );
  }

  // TODO(BE 연동):
  // 현재는 localStorage에서 id로 조회(getCollectBookItemById).
  // 백엔드 연동 시에는:
  // - GET /api/v1/collectbook/:collect_book_id 로 교체
  // - 라우트 param id는 "local uuid"가 아니라 서버가 준 collect_book_id를 사용
  //
  // 또한 상세 화면에서 앞으로 하게 될 작업:
  // - 메모 수정: PATCH /api/v1/collectbook/:id { memo }
  // - 공개/비공개: PATCH /api/v1/collectbook/:id { visibility }
  // - 관람일 수정: PATCH /api/v1/collectbook/:id { visitedAt }
  // - 삭제: DELETE /api/v1/collectbook/:id
  //
  // => 결국 이 파일도 async로 바꾸고,
  //    useEffect로 item을 fetch해서 state로 들고 있게 될 가능성이 높음.
  const item = getCollectBookItemById(id);


  if (!item) {
    return (
      <main className="loungePage">
        <section className="loungeWrap">
          <div className="loungeSubTop">
            <h1 className="loungeSubTitle">티켓 상세</h1>
            <Link className="loungeBackLink" to="/lounge/collectbook">
              ← 컬렉트북으로
            </Link>
          </div>

          <div className="loungeSubPanel">
            <p className="loungeSubHint">해당 티켓을 찾을 수 없습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  const dateRangeText = `${item.exhibition?.startDate ?? "-"} – ${item.exhibition?.endDate ?? "-"}`;

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">티켓 상세</h1>
          <Link className="loungeBackLink" to="/lounge/collectbook">
            ← 컬렉트북으로
          </Link>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <TicketCardModern
            title={(item.exhibition?.title ?? "EXHIBITION").toUpperCase()}
            ticketCode={item.ticketCode}
            dateRangeText={dateRangeText}
            priceText="TARIF : -"
            stubColor="#8FB2D9"
            heroImageUrl={item.exhibition?.posterUrl}
            metaLeft={item.exhibition?.place ?? "—"}
            metaRight={item.visibility === "public" ? "PUBLIC" : "PRIVATE"}
          />

          <div className="loungeSubPanel">
            <p className="loungeSubHint">
              <strong>관람일</strong>: {item.visitedAt}
              <br />
              <strong>메모</strong>: {item.memo ?? "-"}
              <br />
              <strong>ticket_code</strong>: {item.ticketCode}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
