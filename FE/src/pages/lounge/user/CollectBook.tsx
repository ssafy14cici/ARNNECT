// FE/src/pages/lounge/user/CollectBook.tsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../lounge.css";

// ✅ 새 티켓 카드 컴포넌트 + CSS만 사용 (collectbook.css 삭제 가능)
import TicketCardModern from "../../../components/lounge/TicketCardModern";
import "../../../components/lounge/ticketCardModern.css";

import { getCollectBookItems } from "../../../utils/collectbookStorage";

const STUB_COLORS = ["#8FB2D9", "#E9A9B0", "#D7C08A", "#9FD3C7", "#B7A6F6"];

function pickColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return STUB_COLORS[h % STUB_COLORS.length];
}

function formatDateRange(start?: string, end?: string) {
  const s = start?.trim() || "-";
  const e = end?.trim() || "-";
  return `${s} – ${e}`;
}

export default function CollectBook() {
  const nav = useNavigate();
  const items = useMemo(() => getCollectBookItems(), []);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">컬렉트북</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        {/* ✅ collectbook.css 없이 인라인으로 정리 */}
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0 14px" }}>
          <button
            type="button"
            onClick={() => nav("/lounge/collectbook/scan")}
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              borderRadius: 12,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            + 티켓 스캔
          </button>
        </div>

        {items.length === 0 ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">아직 등록된 티켓이 없습니다. “티켓 스캔”으로 추가해보세요.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((it) => (
              <TicketCardModern
                key={it.id}
                title={(it.exhibition?.title ?? "EXHIBITION").toUpperCase()}
                ticketCode={it.ticketCode}
                dateRangeText={formatDateRange(it.exhibition?.startDate, it.exhibition?.endDate)}
                priceText="TARIF : -"
                stubColor={pickColor(it.ticketCode || it.id)}
                heroImageUrl={it.exhibition?.posterUrl}
                metaLeft={it.exhibition?.place ?? "—"}
                metaRight={it.visibility === "public" ? "PUBLIC" : "PRIVATE"}
                onClick={() => nav(`/lounge/collectbook/${it.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
