// FE/src/pages/lounge/artist/qr/QrEntry.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../lounge.css";

import { useIssuedTickets } from "./useIssuedTickets";
import { useAuthStore } from "../../../../features/auth/store";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

type PreviewItem = {
  ticketId: number;
  ticketCode: string;
  ticketImageName?: string;
};

export default function QrEntry() {
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const artistUuid = useAuthStore((s) => s.user?.memberUuid + "");
  const { issued, reloadIssued } = useIssuedTickets(artistUuid);

  const preview = useMemo<PreviewItem[]>(
    () =>
      issued.map((t) => ({
        ticketId: t.ticketId,
        ticketCode: t.ticketCode,
        ticketImageName: (t as any).ticketImageName,
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
            <div className="qr-empty-text">
              No QR tickets yet.
              <br />
              Click below to register a QR ticket.
            </div>
            <div className="qr-empty-actions">
              <button type="button" className="qr-primary" onClick={goIssueNew}>
                Register QR
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="qr-preview">
          <div className="qr-preview-head">
            <div className="qr-preview-title">My Tickets</div>
          </div>

          <div className="qr-preview-grid">
            {preview.map((t) => {
              const ticketImg = resolveMediaUrl(t.ticketImageName);

              return (
                <button
                  key={t.ticketCode}
                  type="button"
                  className="qr-card"
                  onClick={() => goIssueEdit(t.ticketId)}
                  aria-label="Go to edit ticket"
                >
                  {ticketImg ? (
                    <img
                      className="qr-card-ticket"
                      src={ticketImg}
                      alt="ticket"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="qr-card-fallback">?My Tickets?My Tickets+.</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <button type="button" className="qr-fab" onClick={goIssueNew} aria-label="Go to issue/edit QR">
        <span className="qr-fab-icon">+</span>
      </button>
    </div>
  );
}
