// FE/src/pages/lounge/user/CollectBook.tsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../lounge.css";

// ✅ 새 티켓 카드 컴포넌트 + CSS만 사용 (collectbook.css 삭제 가능)
import TicketCardModern from "./TicketCardModern";
import "./ticketCardModern.css";

import { getCollectBookItems } from "../../../../features/collectbook/storage";

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
  // TODO(BE 연동):
  // 현재는 localStorage에서 동기적으로 목록을 읽음(getCollectBookItems()).
  // 백엔드 연동 시에는 아래처럼 "비동기 목록 조회"로 교체해야 함.
  //
  // 1) api/collectbook.ts 추가 (권장)
  //    - listCollectBookItems(): GET /api/v1/collectbook  (예시)
  //    - DTO(snake_case) → FE 모델(camelCase) 변환은 api 레이어에서 처리
  //
  // 2) 이 컴포넌트는 useMemo([]) 대신 useEffect + useState로 교체
  //    - const [items, setItems] = useState<CollectBookItem[]>([])
  //    - useEffect(() => { listCollectBookItems().then(setItems).catch(...) }, [])
  //
  // 3) 주의: 지금은 items를 최초 1회만 읽어서,
  //    scan 후 뒤로 오거나 삭제/수정해도 목록이 자동 갱신되지 않을 수 있음.
  //    (mock 유지하더라도 location 변경 시 재로딩하거나 state로 들고 가는 게 안정적)


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
                // NOTE(임시):
                // TicketCardModern이 좌측 스텁에 ticketCode를 표시하는 구조라
                // 지금은 관람일(visitedAt)을 ticketCode 자리에 넣어 표시하고 있음.
                // TODO: TicketCardModern props를 leftStampValue 같은 이름으로 분리하는 게 정석.
                ticketCode={it.visitedAt}
                dateRangeText={formatDateRange(it.exhibition?.startDate, it.exhibition?.endDate)}
                priceText="TARIF : -"
                stubColor={pickColor(it.ticketCode || it.id)} // 색은 원래 티켓코드 기준 유지
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
