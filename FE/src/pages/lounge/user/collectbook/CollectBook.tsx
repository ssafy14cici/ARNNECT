// FE/src/pages/lounge/user/collectbook/CollectBook.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import "../../lounge.css";
import "./ticketCardModern.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiCollectBookList } from "../../../../features/collectbook/api/real";
import type { CollectBookResponse } from "../../../../features/tickets/api/realTickets";

import { http } from "../../../../shared/api/http";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

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

/**
 * ✅ TicketCardModern(HeroImage) 패턴 그대로:
 * - resolveMediaUrl로 /src prefix 포함 정규화
 * - <img> 실패 시 Authorization 포함 blob 재시도
 */
function AuthedImage({
  src,
  alt,
  className,
  style,
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const resolved = useMemo(() => resolveMediaUrl(src), [src]);

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

  // resolved가 상대경로면 같은 오리진으로 강제(axios baseURL 영향 제거)
  const requestUrl = /^https?:\/\//i.test(resolved) ? resolved : `${window.location.origin}${resolved}`;

  return (
    <img
      className={className}
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
          const res = await http.get(requestUrl, { responseType: "blob" });
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
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              alignItems: "start",
            }}
          >
            {items.map((it, idx) => {
              const createdAt = (it as any).createdAt as string | undefined;
              const ticketImgRaw =
                (it as any).ticketImageUrl ?? (it as any).ticketImageName ?? (it as any).ticketImage ?? "";

              // ✅ 상세에서 정확히 하나 고르도록 at=createdAt 넘김 (중복 ticketCode 대응)
              const toDetail = `/lounge/collectbook/${encodeURIComponent(it.ticketCode)}${
                createdAt ? `?at=${encodeURIComponent(createdAt)}` : ""
              }`;

              return (
                <button
                  key={`${it.ticketCode}_${createdAt ?? idx}`} // ✅ 중복 ticketCode 대응
                  type="button"
                  onClick={() => nav(toDetail)}
                  style={{
                    textAlign: "left",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 14,
                    padding: 10,
                    cursor: "pointer",
                  }}
                >
                  {ticketImgRaw ? (
                    <AuthedImage
                      src={ticketImgRaw}
                      alt="ticket"
                      style={{
                        width: "100%",
                        height: "100%",
                        aspectRatio: "16/10",
                        objectFit: "contain",                
                        background: "rgba(0,0,0,0.35)",      
                        borderRadius: 12,
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16/10",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(255,255,255,0.65)",
                        fontSize: 12,
                      }}
                    >
                      NO IMAGE
                    </div>
                  )}

                  <div style={{ padding: "10px 4px 2px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      {(it.title ?? "EXHIBITION").toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {formatDateRange(it.startDate, it.endDate)}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      RANK : {(it as any).collectRank ?? "-"} · 등록일: {formatKST(createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
