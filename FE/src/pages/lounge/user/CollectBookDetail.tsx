// FE/src/pages/lounge/user/CollectBookDetail.tsx
import { Link, useParams } from "react-router-dom";
import "../lounge.css";
import TicketCardModern from "../../../components/lounge/TicketCardModern";
import "../../../components/lounge/ticketCardModern.css";

import { getCollectBookItemById } from "../../../utils/collectbookStorage";

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
