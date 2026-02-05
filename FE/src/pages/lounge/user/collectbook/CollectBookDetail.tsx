import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../../lounge.css";

import TicketCardModern from "./TicketCardModern";
import "./ticketCardModern.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiCollectBookList } from "../../../../features/collectbook/api/real";
import type { CollectBookResponse } from "../../../../features/tickets/api/realTickets";
import { http } from "../../../../shared/api/http";

function formatDateRange(start?: string, end?: string) {
  const s = start?.trim() || "-";
  const e = end?.trim() || "-";
  return `${s} – ${e}`;
}

function hhmm(t?: string) {
  if (!t) return "-";
  return String(t).slice(0, 5);
}

function formatKST(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function resolveMaybeRelativeUrl(url?: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return url;

  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

/** <img>가 403/401로 깨질 때 Authorization 포함해서 blob로 재로딩 */
function AuthedImage({
  src,
  alt,
  style,
}: {
  src?: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const resolved = useMemo(() => resolveMaybeRelativeUrl(src), [src]);

  const [displaySrc, setDisplaySrc] = useState<string>("");
  const [triedBlob, setTriedBlob] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setDisplaySrc(resolved);
    setTriedBlob(false);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [resolved]);

  if (!resolved || !displaySrc) return null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      style={style}
      onError={async () => {
        if (triedBlob) {
          setDisplaySrc("");
          return;
        }
        try {
          setTriedBlob(true);
          const res = await http.get(resolved, { responseType: "blob" });
          const objUrl = URL.createObjectURL(res.data);
          blobUrlRef.current = objUrl;
          setDisplaySrc(objUrl);
        } catch {
          setDisplaySrc("");
        }
      }}
    />
  );
}

const PROFILE_PATH = (artistUuid: string) => `/members/${artistUuid}`;

export default function CollectBookDetail() {
  // ✅ 라우트는 기존 :id 그대로 써도 됨 (여기서는 id를 ticketCode로 취급)
  const { id } = useParams<{ id: string }>();

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const ticketCode = useMemo(() => {
    const raw = id ?? "";
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [id]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [item, setItem] = useState<CollectBookResponse | null>(null);

  useEffect(() => {
    if (!ticketCode) return;

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

        const found = Array.isArray(list) ? list.find((x) => x.ticketCode === ticketCode) : undefined;
        setItem(found ?? null);
        if (!found) setError("해당 티켓을 찾을 수 없습니다. (ticketCode 불일치)");
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "티켓 상세를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ticketCode, isLoggedIn, ownerUuid]);

  if (!ticketCode) {
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
            <p className="loungeSubHint">잘못된 접근입니다. (ticketCode 없음)</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">티켓 상세</h1>
          <Link className="loungeBackLink" to="/lounge/collectbook">
            ← 컬렉트북으로
          </Link>
        </div>

        {loading ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">{error}</p>
          </div>
        ) : !item ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">해당 티켓을 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <TicketCardModern
              title={(item.title ?? "EXHIBITION").toUpperCase()}
              ticketCode={item.ticketCode}
              dateRangeText={formatDateRange(item.startDate, item.endDate)}
              priceText={`RANK : ${item.collectRank ?? "-"}`}
              // ✅ 선택한 디자인 결과 이미지
              heroImageUrl={item.ticketImageUrl}
              metaLeft={item.addressDetail ? `${item.address} (${item.addressDetail})` : item.address}
              metaRight={"COLLECTED"}
            />

            <div className="loungeSubPanel">
              <p className="loungeSubHint" style={{ lineHeight: 1.75 }}>
                <strong>전시명</strong>: {item.title}
                <br />
                <strong>장소</strong>: {item.address} {item.addressDetail ? `(${item.addressDetail})` : ""}
                <br />
                <strong>기간</strong>: {item.startDate} ~ {item.endDate}
                <br />
                <strong>운영시간</strong>: {hhmm(item.startTime)} ~ {hhmm(item.endTime)}
                <br />
                <strong>랭크</strong>: {item.collectRank}
                <br />
                <strong>등록일</strong>: {formatKST(item.createdAt)}
                <br />
                {/* ✅ UUID는 “출력”하지 말고 링크로만 사용 */}
                <strong>아티스트</strong>:{" "}
                <Link to={PROFILE_PATH(item.artistUuid)} style={{ textDecoration: "underline" }}>
                  프로필로 이동
                </Link>
              </p>
            </div>

            <div className="loungeSubPanel">
              <h2 className="loungeSubPanelTitle" style={{ marginBottom: 10 }}>
                티켓 이미지
              </h2>
              {item.ticketImageUrl ? (
                <AuthedImage
                  src={item.ticketImageUrl}
                  alt="ticket"
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    display: "block",
                  }}
                />
              ) : (
                <p className="loungeSubHint">티켓 이미지가 제공되지 않았습니다.</p>
              )}
            </div>

            <div className="loungeSubPanel">
              <h2 className="loungeSubPanelTitle" style={{ marginBottom: 10 }}>
                QR
              </h2>
              {item.qrImageUrl ? (
                <div style={{ background: "#fff", padding: 12, borderRadius: 12, display: "inline-block" }}>
                  <AuthedImage src={item.qrImageUrl} alt="qr" style={{ width: 220, height: 220, display: "block" }} />
                </div>
              ) : (
                <p className="loungeSubHint">QR 이미지가 제공되지 않았습니다.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
