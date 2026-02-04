// FE/src/pages/lounge/artist/qr/QrPanel.tsx
import { useMemo } from "react";
import QRCode from "react-qr-code";
import { renderToStaticMarkup } from "react-dom/server";

import { downloadSvgAsPng } from "../../../../features/tickets/qrDownload";
import { resolveTicketMedia } from "../../../../features/tickets/resolveTicketMedia";

type Props = {
  ticketCode: string;
  busy: boolean;

  // 서버가 준 qrImageName(예: "src/ticket/uuid") 또는 절대URL
  qrImageName: string;
};

export default function QrPanel({ ticketCode, busy, qrImageName }: Props) {
  const qrValue = useMemo(() => ticketCode, [ticketCode]);

  const downloadQr = async () => {
    // ✅ DOM에 svg가 없더라도 ticketCode로 SVG를 생성해서 다운로드
    const markup = renderToStaticMarkup(<QRCode value={qrValue} size={220} />);
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = doc.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    await downloadSvgAsPng(svg, `QR_${ticketCode || "ticket"}.png`);
  };

  return (
    <div className="loungeSubPanel" style={{ marginTop: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          {qrImageName ? (
            <img
              src={resolveTicketMedia(qrImageName)}
              alt="QR"
              style={{ width: 220, height: 220 }}
            />
          ) : (
            <QRCode value={qrValue} size={220} />
          )}
        </div>

        <div className="loungeSubActions" style={{ gap: 12 }}>
          <button
            className="loungeSubBtn"
            disabled={busy}
            onClick={() => {
              navigator.clipboard.writeText(ticketCode);
              alert("복사됨");
            }}
          >
            코드 복사
          </button>

          <button className="loungeSubBtn" disabled={busy} onClick={downloadQr} style={{ borderColor: "#fff" }}>
            QR 저장
          </button>
        </div>
      </div>
    </div>
  );
}
