import React from "react";

type TicketQRProps = {
  size?: number;                 // 박스 크기
  variant?: "dark" | "light";     // 박스 컬러 톤
  label?: string;                // 기본 "QR"
  radius?: number;               // 필요하면 둥글게
};

export default function TicketQR({
  size = 40,
  variant = "dark",
  label = "QR",
  radius = 0,
}: TicketQRProps) {
  const dark = variant === "dark";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: dark ? "#000" : "#fff",
        color: dark ? "#fff" : "#000",
        border: dark ? "none" : "1px solid #000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(8, Math.floor(size * 0.2)),
        fontWeight: 700,
        letterSpacing: "1px",
        boxSizing: "border-box",
        userSelect: "none",
      }}
      aria-label="QR placeholder"
    >
      {label}
    </div>
  );
}
