import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../lounge.css";

import TicketCardModern from "./TicketCardModern";
import "./ticketCardModern.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiCollectBookList } from "../../../../features/collectbook/api/real";
import type { CollectBookResponse } from "../../../../features/tickets/api/realTickets";

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

function formatKST(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function CollectBook() {
  const nav = useNavigate();

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [items, setItems] = useState<CollectBookResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canLoad = useMemo(() => isLoggedIn && !!ownerUuid, [isLoggedIn, ownerUuid]);

  useEffect(() => {
    if (!canLoad) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await apiCollectBookList(ownerUuid);
        if (!alive) return;
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "콜렉트북을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canLoad, ownerUuid]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">

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

        {!isLoggedIn || !ownerUuid ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">로그인 후 이용해주세요.</p>
          </div>
        ) : loading ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">아직 등록된 티켓이 없습니다. “티켓 스캔”으로 추가해보세요.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((it) => (
              <TicketCardModern
                key={it.ticketCode}
                title={(it.title ?? "EXHIBITION").toUpperCase()}
                ticketCode={it.ticketCode}
                dateRangeText={formatDateRange(it.startDate, it.endDate)}
                priceText={`RANK : ${it.collectRank ?? "-"}`}
                stubColor={pickColor(it.ticketCode)}
                // ✅ 여기 핵심: 선택한 디자인 결과 이미지
                heroImageUrl={it.ticketImageUrl}
                metaLeft={it.addressDetail ? `${it.address} (${it.addressDetail})` : it.address}
                metaRight={`등록일: ${formatKST(it.createdAt)}`}
                onClick={() => nav(`/lounge/collectbook/${encodeURIComponent(it.ticketCode)}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
