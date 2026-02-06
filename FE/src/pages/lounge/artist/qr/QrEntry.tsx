// FE/src/pages/lounge/artist/qr/QrEntry.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./qr.css";

import { useIssuedTickets } from "./useIssuedTickets";
import { useAuthStore } from "../../../../features/auth/store";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

type PreviewItem = {
  ticketId: number;
  ticketCode: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  ticketImageName?: string;
  qrImageName?: string;
};

export default function QrEntry() {
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        ticketImageName: (t as any).ticketImageName,
        qrImageName: (t as any).qrImageName,
      })),
    [issued],
  );

  useEffect(() => {
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

  const goIssueNew = () => nav("/tickets/issue");
  const goIssueEdit = (ticketId: number) => nav(`/tickets/issue?edit=${ticketId}`);

  return (
    <div className="qr-page">
      <header className="qr-head">
        <h1 className="qr-title">QR 발급</h1>
        <p className="qr-sub">전시 QR을 발급하고 관리할 수 있습니다.</p>
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
              아래 버튼을 눌러 등록을 시작하세요.
            </div>
            <div className="qr-empty-actions">
              <button type="button" className="qr-primary-btn" onClick={goIssueNew}>
                QR 등록하기
              </button>
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
            {preview.map((t) => {
              const ticketImg = resolveMediaUrl(t.ticketImageName);
              const qrImg = resolveMediaUrl(t.qrImageName);

              return (
                <button
                  key={t.ticketCode}
                  type="button"
                  className="qr-card"
                  onClick={() => goIssueEdit(t.ticketId)}
                  aria-label={`${t.title || "티켓"} 수정으로 이동`}
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

                  {ticketImg ? (
                    <div className="qr-card-media">
                      <img
                        className="qr-card-ticket"
                        src={ticketImg}
                        alt="ticket"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {qrImg ? (
                        <img
                          className="qr-card-qr"
                          src={qrImg}
                          alt="qr"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <button type="button" className="qr-fab" onClick={goIssueNew} aria-label="QR 발급/수정 화면으로 이동">
        <span className="qr-fab-icon">📷</span>
      </button>
    </div>
  );
}
