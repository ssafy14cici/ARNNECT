import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function ModernTicket({ data }: TicketDesignProps) {
  const jaggedStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: "12px",
    backgroundSize: "20px 20px",
    backgroundImage: "radial-gradient(circle at 10px 0, transparent 6px, #000 7px)",
    opacity: 1,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Courier New', Courier, monospace",
        boxSizing: "border-box",
        padding: "20px 0",
      }}
    >
      {/* 펀칭(상/하) */}
      <div style={{ ...jaggedStyle, top: -6, transform: "rotate(180deg)" }} />
      <div style={{ ...jaggedStyle, bottom: -6 }} />

      <div style={{ display: "flex", height: "100%" }}>
        {/* 좌측 타이틀 영역 */}
        <div
          style={{
            flex: "0 0 40%",
            padding: "14px 10px",
            boxSizing: "border-box",
            borderRight: "1px solid rgba(255,255,255,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              textOrientation: "upright",
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 0.9,
              textTransform: "uppercase",
              opacity: 0.98,
            }}
          >
            {data.title || "EXHIBITION"}
          </div>
        </div>

        {/* 우측 정보 그리드 */}
        <div
          style={{
            flex: 1,
            padding: "14px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Location box */}
          <div style={{ border: "1px solid #fff", padding: "10px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 6, letterSpacing: 2 }}>LOCATION</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {data.address}
              {data.addressDetail ? `, ${data.addressDetail}` : ""}
            </div>
          </div>

          {/* Date/Time box */}
          <div style={{ border: "1px solid #fff", padding: "10px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 6, letterSpacing: 2 }}>DATE</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {data.startDate} - {data.endDate}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 6 }}>
              {data.startTime} - {data.endTime}
            </div>
          </div>

          {/* QR row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #fff",
              padding: "10px",
              boxSizing: "border-box",
              marginTop: "auto",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.85 }}>ADMIT ONE</div>

            {/* ✅ QR placeholder (공통) */}
            <TicketQR size={44} variant="light" label="QR" radius={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
