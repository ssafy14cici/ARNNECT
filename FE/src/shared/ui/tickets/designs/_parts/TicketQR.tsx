// FE/src/shared/ui/tickets/designs/_parts/TicketQR.tsx
import React, { useContext, useMemo } from "react";
import QRCode from "react-qr-code";
import { TicketQrValueContext } from "../../TicketPreview";

type Props = {
  size?: number;
  variant?: "dark" | "light";
  value?: string; // (선택) 직접 주면 그걸 사용
};

export default function TicketQR({ size = 56, variant = "dark", value }: Props) {
  const ctxValue = useContext(TicketQrValueContext);
  const qrValue = (value ?? ctxValue ?? "").trim();

  const boxStyle: React.CSSProperties = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: Math.max(8, Math.floor(size * 0.18)),
      background: variant === "dark" ? "#fff" : "rgba(255,255,255,0.92)",
      display: "grid",
      placeItems: "center",
      overflow: "hidden",
    }),
    [size, variant],
  );

  // qrValue 없으면 기존처럼 placeholder
  if (!qrValue) {
    return (
      <div style={boxStyle}>
        <div
          style={{
            width: "72%",
            height: "72%",
            border: `2px solid ${variant === "dark" ? "#000" : "#111"}`,
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: Math.max(10, Math.floor(size * 0.18)),
            color: variant === "dark" ? "#000" : "#111",
          }}
        >
          QR
        </div>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <QRCode value={qrValue} size={Math.floor(size * 0.86)} />
    </div>
  );
}
