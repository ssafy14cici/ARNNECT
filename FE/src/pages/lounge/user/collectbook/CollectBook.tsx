// FE/src/pages/lounge/user/CollectBook.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

function resolveMaybeRelativeUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return url;

  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export default function CollectBook() {
  const nav = useNavigate();
  const loc = useLocation();

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const focusCode = useMemo(() => {
    const st = (loc.state ?? {}) as Record<string, unknown>;
    return typeof st.focusCode === "string" ? st.focusCode : "";
  }, [loc.state]);

  const [items, setItems] = useState<CollectBookResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !ownerUuid) {
      setItems([]);
      return;
    }

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
        setItems([]);
        setError(e?.message ?? "콜렉트북 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isLoggedIn, ownerUuid]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">컬렉트북</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

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

        {!isLoggedIn && (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">로그인 후 이용할 수 있습니다.</p>
          </div>
        )}

        {isLoggedIn && focusCode && (
          <div className="loungeNotice">최근 스캔한 티켓: {focusCode}</div>
        )}

        {isLoggedIn && error && <div className="loungeNotice">{error}</div>}

        {isLoggedIn && loading && (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">불러오는 중...</p>
          </div>
        )}

        {isLoggedIn && !loading && items.length === 0 ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">아직 등록된 티켓이 없습니다. “티켓 스캔”으로 추가해보세요.</p>
          </div>
        ) : null}

        {isLoggedIn && !loading && items.length > 0 && (
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((it) => (
              <TicketCardModern
                key={it.ticketCode}
                title={(it.title ?? "EXHIBITION").toUpperCase()}
                ticketCode={it.ticketCode}
                dateRangeText={formatDateRange(it.startDate, it.endDate)}
                priceText={typeof it.collectRank === "number" ? `RANK : ${it.collectRank}` : "RANK : -"}
                stubColor={pickColor(it.ticketCode)}
                heroImageUrl={resolveMaybeRelativeUrl(it.ticketImageUrl)}
                metaLeft={it.addressDetail ? `${it.address} (${it.addressDetail})` : it.address}
                metaRight={"COLLECTED"}
                onClick={() => nav(`/lounge/collectbook/${encodeURIComponent(it.ticketCode)}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
