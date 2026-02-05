// FE/src/pages/lounge/artist/qr/QrPanel.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import "../../lounge.css";

import { svgToPngFile } from "../../../../features/tickets/qrDownload";
import { resolveTicketMedia } from "../../../../features/tickets/resolveTicketMedia";

type Props = {
  ticketCode: string;
  busy: boolean;
  qrImageName: string;
};

export default function QrPanel({ ticketCode, busy, qrImageName }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const serverQrUrl = useMemo(() => {
    if (!qrImageName) return "";
    return resolveTicketMedia(qrImageName);
  }, [qrImageName]);

  const downloadQrOnly = useCallback(async () => {
    if (!ticketCode) return;

    setError("");
    setDownloading(true);
    try {
      const svg = wrapRef.current?.querySelector("svg") as SVGSVGElement | null;
      if (!svg) throw new Error("QR 요소를 찾지 못했습니다.");

      const file = await svgToPngFile(svg, `QR_${ticketCode}.png`);

      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "QR 다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }, [ticketCode]);

  return (
    <div className="loungeSubPanel" style={{ textAlign: "left", marginTop: 16 }}>
      <h3 className="loungeSubPanelTitle" style={{ marginTop: 0 }}>
        발급된 QR
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>TICKET CODE</div>
          <div style={{ wordBreak: "break-all", fontWeight: 700, marginBottom: 12 }}>{ticketCode}</div>

          <div
            ref={wrapRef}
            style={{
              width: 240,
              height: 240,
              borderRadius: 14,
              background: "#fff",
              display: "grid",
              placeItems: "center",
              padding: 12,
            }}
          >
            <QRCode value={ticketCode} size={220} />
          </div>

          <div className="loungeSubActions" style={{ marginTop: 12, justifyContent: "flex-start", gap: 10 }}>
            <button className="loungeSubBtn" type="button" onClick={downloadQrOnly} disabled={busy || downloading}>
              {downloading ? "다운로드 중..." : "QR만 저장(PNG)"}
            </button>

            {serverQrUrl && (
              <a
                className="loungeSubBtn"
                href={serverQrUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                서버 QR 열기
              </a>
            )}
          </div>

          {error && <div className="loungeNotice" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
          <div style={{ marginBottom: 8 }}>
            - 업로드용 <b>qrImage</b>는 <b>qrcode</b>로 PNG를 직접 생성해서 서버에 전송합니다.
          </div>
          <div style={{ marginBottom: 8 }}>
            - 티켓 캡처(ticketImage)에도 QR이 들어가도록, <b>미리보기 DOM</b>에 QR을 오버레이했습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
