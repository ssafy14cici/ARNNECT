import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../lounge.css";

import { listCollectBookItems } from "../../../utils/collectbookStorage";
import type { CollectBookItem } from "../../../types/collectbook";

export default function CollectBook() {
  const location = useLocation();
  const [items, setItems] = useState<CollectBookItem[]>([]);

  useEffect(() => {
    setItems(listCollectBookItems());
  }, [location.key]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">컬렉트북</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <div className="loungeSubPanel">
          <div className="loungeSubActions" style={{ justifyContent: "flex-end" }}>
            <Link className="loungeSubBtn" to="/lounge/collectbook/scan">
              티켓 스캔
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="loungeNotice" style={{ marginTop: 12 }}>
              아직 등록된 티켓이 없습니다. “티켓 스캔”으로 추가하세요.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {items.map((it) => (
                <Link
                  key={it.id}
                  to={`/lounge/collectbook/${it.id}`}
                  className="loungeSubPanel"
                  style={{
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 14,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      {it.exhibition?.posterUrl ? (
                        <img
                          src={it.exhibition.posterUrl}
                          alt="poster"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>

                    <div>
                      <div className="loungeSubPanelTitle" style={{ marginBottom: 6 }}>
                        {it.exhibition?.title ?? "전시 정보 없음"}
                      </div>
                      <div className="loungeSubHint">
                        <strong>관람일</strong>: {it.visitedAt}
                        <br />
                        <strong>장소</strong>: {it.exhibition?.place ?? "-"}
                        <br />
                        <strong>스캔</strong>: {new Date(it.scannedAt).toLocaleString()}
                        <br />
                        <strong>ticket_code</strong>: {it.ticketCode}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
