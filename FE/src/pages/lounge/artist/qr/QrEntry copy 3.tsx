// FE/src/pages/lounge/artist/qr/QrEntry.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./qr.css";

import { useIssuedTickets, type TicketDesign } from "./useIssuedTickets";
import { resolveTicketMedia } from "../../../../features/tickets/resolveTicketMedia";
import { useAuthStore } from "../../../../features/auth/store";

// ✅ TicketPreview로 “썸네일 fallback” 제공
import TicketPreview from "../../../../shared/ui/tickets/TicketPreview";

type PreviewItem = {
  ticketId: number;
  ticketCode: string;

  title: string;
  address: string;
  addressDetail?: string;

  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;

  ticketImageName?: string;
  ticketDesign: TicketDesign;
};

export default function QrEntry() {
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ 로그인 안 하면 여기까지 못 온다 해도, 안전하게 null 가드 유지
  const artistUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const { issued, reloadIssued } = useIssuedTickets(artistUuid);

  // ✅ 최근 3개만 노출
  const preview = useMemo<PreviewItem[]>(
    () =>
      issued.slice(0, 3).map((t) => ({
        ticketId: t.ticketId,
        ticketCode: t.ticketCode,

        title: t.title ?? "",
        address: t.address ?? "",
        addressDetail: t.addressDetail ?? "",

        startDate: t.startDate ?? "",
        endDate: t.endDate ?? "",
        startTime: t.startTime ?? "",
        endTime: t.endTime ?? "",

        ticketImageName: t.ticketImageName || "",
        ticketDesign: t.ticketDesign ?? "BASIC",
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

  const goIssue = () => nav("/tickets/issue");

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
              아래 버튼을 눌러 발급을 시작하세요.
            </div>

            {/* ✅ 빈 상태일 때 CTA도 하나 같이 주면 UX 좋아짐 */}
            <div style={{ marginTop: 14 }}>
              <button type="button" className="qr-cta" onClick={goIssue}>
                QR 발급하러 가기 →
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="qr-preview">
          <div className="qr-preview-head">
            <div className="qr-preview-title">최근 발급</div>
            <button type="button" className="qr-link" onClick={goIssue}>
              전체 관리 →
            </button>
          </div>

          <div className="qr-preview-grid">
            {preview.map((t) => (
              <button
                key={t.ticketCode}
                type="button"
                className="qr-card"
                onClick={goIssue}
                aria-label={`${t.title || "전시"} QR 관리로 이동`}
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

                {/* ✅ 1) 서버에 저장된 ticketImageName이 있으면 그걸 우선 보여줌 */}
                {t.ticketImageName ? (
                  <img
                    className="qr-card-poster"
                    src={resolveTicketMedia(t.ticketImageName)}
                    alt="ticket"
                    onError={(e) => {
                      // 로드 실패 시: 이미지 숨기고 fallback 썸네일 노출되게 state로 처리하고 싶지만,
                      // 여기서는 “즉시” fallback이 보여야 해서, 아래 fallback 영역을 항상 렌더하고
                      // 이미지가 성공하면 CSS로 위에 쌓이게(절대배치) 처리하는 방식이 더 안정적임.
                      // 그래서 onError에서는 그냥 display:none 처리만 하고, fallback은 항상 보여준다.
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}

                {/* ✅ 2) fallback: TicketPreview로 렌더링한 썸네일 (ticketImageName이 없거나, img가 숨겨지면 이게 보임) */}
                <div className="qr-card-preview">
                  <TicketPreview
                    designType={t.ticketDesign}
                    data={{
                      title: t.title,
                      address: t.address,
                      addressDetail: t.addressDetail,
                      startDate: t.startDate,
                      endDate: t.endDate,
                      startTime: t.startTime,
                      endTime: t.endTime,
                      posterUrl: "", // entry에서는 poster를 못 받는 구조면 비워두는 게 안전
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ✅ FAB: 위치는 css에서 “화면 끝”이 아니라 “콘텐츠 안쪽”으로 보정 */}
      <button type="button" className="qr-fab" onClick={goIssue} aria-label="QR 발급/수정 화면으로 이동">
        <span className="qr-fab-icon">📷</span>
      </button>
    </div>
  );
}
