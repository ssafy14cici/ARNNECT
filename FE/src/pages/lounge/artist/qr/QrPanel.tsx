import { useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { updateExhibitionByCode } from "../../../../features/tickets/api";
import { downloadSvgAsPng, svgToDataUrl } from "../../../../features/tickets/qrDownload";
import { normalizeImageToSrc } from "./useIssuedTickets";

type Props = {
  ticketCode: string;
  qrValue: string;
  busy: boolean;

  qrImageSrc: string;
  setQrImageSrc: (v: string) => void;

  onReloadIssued: () => Promise<void>;
};

export default function QrPanel({
  ticketCode,
  qrValue,
  busy,
  qrImageSrc,
  setQrImageSrc,
  onReloadIssued,
}: Props) {
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const downloadQr = async () => {
    const wrap = qrWrapRef.current;
    const svg = wrap?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    await downloadSvgAsPng(svg, `QR_${ticketCode || "ticket"}.png`);
  };

  // ✅ QR SVG를 base64(data-url)로 만들어 서버(image)에 저장 (mock에서 재방문/목록용)
  useEffect(() => {
    if (!ticketCode) return;
    if (busy) return;
    if (qrImageSrc) return;

    const timer = setTimeout(async () => {
      const wrap = qrWrapRef.current;
      const svg = wrap?.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;

      const dataUrl = svgToDataUrl(svg);
      setQrImageSrc(dataUrl);

      const base64Only = dataUrl.split(",")[1] ?? "";

      try {
        await updateExhibitionByCode(ticketCode, { image: base64Only } as any);
        await onReloadIssued();
      } catch (e) {
        console.error("자동 업로드 실패", e);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [ticketCode, busy, qrImageSrc, setQrImageSrc, onReloadIssued]);

  return (
    <div className="loungeSubPanel" style={{ marginTop: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div ref={qrWrapRef} style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
          {qrImageSrc ? (
            <img src={normalizeImageToSrc(qrImageSrc)} alt="QR" style={{ width: 220, height: 220 }} />
          ) : (
            <QRCode value={qrValue} size={220} />
          )}
        </div>

        <div className="loungeSubActions" style={{ gap: 12 }}>
          <button
            className="loungeSubBtn"
            onClick={() => {
              navigator.clipboard.writeText(ticketCode);
              alert("복사됨");
            }}
          >
            코드 복사
          </button>

          <button className="loungeSubBtn" onClick={downloadQr} style={{ borderColor: "#fff" }}>
            QR 저장
          </button>
        </div>
      </div>
    </div>
  );
}
