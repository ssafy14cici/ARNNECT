// FE/src/pages/lounge/user/CollectBookDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

function hhmm(t?: string) {
  if (!t) return "-";
  // "HH:mm:ss" 또는 "HH:mm" → "HH:mm"
  return String(t).slice(0, 5);
}

function resolveMaybeRelativeUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return url;

  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export default function CollectBookDetail() {
  // 라우트가 :ticketCode 로 바뀌면 ticketCode 사용
  // 아직 :id 라면 id도 ticketCode로 취급 (fallback)
  const params = useParams() as Record<string, string | undefined>;
  const rawParam = params.ticketCode ?? params.id ?? "";

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const ticketCodeParam = useMemo(() => {
    if (!rawParam) return "";
    try {
      return decodeURIComponent(rawParam);
    } catch {
      return rawParam;
    }
  }, [rawParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [item, setItem] = useState<CollectBookResponse | null>(null);

  useEffect(() => {
    // 파라미터 없으면 즉시 종료
    if (!ticketCodeParam) return;

    // 로그인/uuid 없으면 상세를 구성할 수 없음 (list API가 memberUuid 필요)
    if (!isLoggedIn || !ownerUuid) {
      setError("로그인이 필요합니다.");
      setItem(null);
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      setItem(null);

      try {
        const list = await apiCollectBookList(ownerUuid);
        if (!alive) return;

        const found = Array.isArray(list)
          ? list.find((x) => x.ticketCode === ticketCodeParam)
          : undefined;

        setItem(found ?? null);

        if (!found) {
          setError("해당 티켓을 찾을 수 없습니다. (ticketCode 불일치)");
        }
      } catch (e: any) {
        if (!alive) return;
        const msg = e?.message ?? "티켓 상세를 불러오지 못했습니다.";
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ticketCodeParam, isLoggedIn, ownerUuid]);

  // 공통 헤더
  const Header = (
    <div className="loungeSubTop">
      <h1 className="loungeSubTitle">티켓 상세</h1>
      <Link className="loungeBackLink" to="/lounge/collectbook">
        ← 컬렉트북으로
      </Link>
    </div>
  );

  if (!ticketCodeParam) {
    return (
      <main className="loungePage">
        <section className="loungeWrap">
          {Header}
          <div className="loungeSubPanel">
            <p className="loungeSubHint">잘못된 접근입니다. (ticketCode 없음)</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        {Header}

        {loading && (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">불러오는 중...</p>
          </div>
        )}

        {!loading && error && (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">{error}</p>
          </div>
        )}

        {!loading && item && (
          <div style={{ display: "grid", gap: 14 }}>
            <TicketCardModern
              title={(item.title ?? "EXHIBITION").toUpperCase()}
              ticketCode={item.ticketCode}
              dateRangeText={formatDateRange(item.startDate, item.endDate)}
              priceText={typeof item.collectRank === "number" ? `RANK : ${item.collectRank}` : "RANK : -"}
              stubColor={pickColor(item.ticketCode)}
              heroImageUrl={resolveMaybeRelativeUrl(item.ticketImageUrl)}
              metaLeft={item.addressDetail ? `${item.address} (${item.addressDetail})` : item.address}
              metaRight={"COLLECTED"}
            />

            <div className="loungeSubPanel">
              <p className="loungeSubHint" style={{ lineHeight: 1.7 }}>
                <strong>티켓코드</strong>: {item.ticketCode}
                <br />
                <strong>아티스트 UUID</strong>: {item.artistUuid}
                <br />
                <strong>기간</strong>: {item.startDate} ~ {item.endDate}
                <br />
                <strong>운영시간</strong>: {hhmm(item.startTime)} ~ {hhmm(item.endTime)}
                <br />
                <strong>등록일</strong>: {item.createdAt ?? "-"}
              </p>

              {/* QR 이미지 (BE가 URL로 내려줌) */}
              {item.qrImageUrl && (
                <div
                  style={{
                    marginTop: 12,
                    background: "#fff",
                    padding: 12,
                    borderRadius: 12,
                    display: "inline-block",
                  }}
                >
                  <img
                    src={resolveMaybeRelativeUrl(item.qrImageUrl)}
                    alt="qr"
                    style={{ width: 220, height: 220, display: "block" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* NOTE:
               기존 mock에는 memo/visitedAt/visibility 등이 있었지만,
               현재 BE CollectBookResponse엔 해당 필드가 없음.
               (추후 BE DTO 확장 or 별도 상세 API 생기면 여기서 추가 구현)
            */}
          </div>
        )}
      </section>
    </main>
  );
}
