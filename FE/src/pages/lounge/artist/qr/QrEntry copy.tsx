// FE/src/pages/lounge/artist/qr/QrEntry.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./qr.css";

import { useIssuedTickets } from "./useIssuedTickets";
import { resolveTicketMedia } from "../../../../features/tickets/resolveTicketMedia";
import { useAuthStore } from "../../../../features/auth/store";

type PreviewItem = {
  ticketId: number;
  ticketCode: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  ticketImageName?: string;
};

export default function QrEntry() {
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ artistUuid를 AuthStore에서 가져와서 전달해야 발급 목록이 제대로 로드됨
  const artistUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const { issued, reloadIssued } = useIssuedTickets(artistUuid);

  const preview = useMemo<PreviewItem[]>(
    () =>
      issued.slice(0, 3).map((t) => ({
        ticketId: t.ticketId,
        ticketCode: t.ticketCode,
        title: t.title ?? "",
        address: t.address ?? "",
        startDate: t.startDate ?? "",
        endDate: t.endDate ?? "",
        ticketImageName: t.ticketImageName,
      })),
    [issued],
  );

  useEffect(() => {
    // artistUuid 없으면 호출하지 않음
    if (!artistUuid) return;

    let alive = true;
    (async () => {
      setBusy(true);
      setError("");
      try {
        await reloadIssued();
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "발급 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [artistUuid, reloadIssued]);

  return (
    <div className="qr-page">
      <header className="qr-head">
        <h1 className="qr-title">QR 발급</h1>
        <p className="qr-sub">우측 하단 카메라 버튼을 눌러 QR 발급/수정 화면으로 이동하세요.</p>
      </header>

      {busy && <div className="qr-state">불러오는 중...</div>}
      {!busy && error && <div className="qr-error">{error}</div>}

      {!busy && !error && preview.length === 0 ? (
        <section className="qr-empty">
          <div className="qr-empty-box">
            <div className="qr-empty-icon">🧾</div>
            <div className="qr-empty-text">
              아직 발급된 QR이 없습니다.
              <br />
              카메라 버튼을 눌러 발급을 시작하세요.
            </div>
          </div>
        </section>
      ) : (
        <section className="qr-preview">
          <div className="qr-preview-head">
            <div className="qr-preview-title">최근 발급</div>
            <button type="button" className="qr-link" onClick={() => nav("/tickets/issue")}>
              전체 관리 →
            </button>
          </div>

          <div className="qr-preview-grid">
            {preview.map((t) => (
              <button
                key={t.ticketCode}
                type="button"
                className="qr-card"
                onClick={() => nav("/tickets/issue")}
                aria-label={`${t.title} QR 관리로 이동`}
              >
                <div className="qr-card-top">
                  <div className="qr-card-title">{t.title || "Untitled"}</div>
                  <div className="qr-card-code">{t.ticketCode}</div>
                </div>

                <div className="qr-card-meta">
                  <div>📍 {t.address || "-"}</div>
                  <div>
                    📅 {t.startDate || "-"} ~ {t.endDate || "-"}
                  </div>
                </div>

                {t.ticketImageName && (
                  <img
                    className="qr-card-poster"
                    src={resolveTicketMedia(t.ticketImageName)}
                    alt="ticket"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 우측 하단 FAB */}
      <button type="button" className="qr-fab" onClick={() => nav("/tickets/issue")} aria-label="QR 발급/수정 화면으로 이동">
        <span className="qr-fab-icon">📷</span>
      </button>
    </div>
  );
}
