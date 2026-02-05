// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function HoloAbstractTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ABSTRACT").toUpperCase();

  return (
    <div style={{
      width: "100%", height: "100%",
      borderRadius: 10, overflow: "hidden",
      position: "relative", color: "#fff",
      fontFamily: "'Inter', sans-serif",
      background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)",
    }}>
      {/* 홀로그램 배경 효과 */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(circle at 10% 20%, rgba(255, 0, 150, 0.5), transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(0, 255, 255, 0.5), transparent 40%)
        `,
        filter: "blur(20px)", zIndex: 0
      }} />

      {/* 액체 형태 오브젝트 */}
      <svg style={{ position: "absolute", top: "-10%", left: "15%", width: "110%", height: "120%", filter: "blur(30px)", opacity: 0.6, zIndex: 1 }} viewBox="0 0 200 200">
        <path fill="#FDE047" d="M40,-60C52,-52,62,-40,68,-26C74,-12,76,4,72,18C68,32,58,44,46,54C34,64,20,72,4,76C-12,80,-28,80,-42,74C-56,68,-68,56,-74,42C-80,28,-80,12,-76,-2C-72,-16,-64,-30,-54,-40C-44,-50,-32,-56,-20,-62C-8,-68,4,-74,20,-72C36,-70,48,-60,40,-60Z" transform="translate(100 100)" />
      </svg>

      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", zIndex: 2 }}>
        {/* 메인 정보 영역 */}
        <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h1 style={{ fontSize: "44px", margin: 0, fontWeight: 900, letterSpacing: "2px", lineHeight: 1 }}>{title}</h1>
            <div style={{ fontSize: "12px", fontWeight: 700, textAlign: "right", opacity: 0.9 }}>ABSTRACT ART<br />EXHIBITION</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: "4px", width: "fit-content" }}>
              {data.startDate} - {data.endDate}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.9 }}>
              <strong>Location:</strong> {data.address} {data.addressDetail}
            </div>
          </div>

          {/* 바코드 */}
          <div style={{ height: "22px", width: "180px", opacity: 0.8, background: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 5px, #fff 5px, #fff 6px)" }} />
        </div>

        {/* 우측 스텁 영역 */}
        <div style={{ width: "130px", borderLeft: "2px dotted rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", padding: "15px 0", background: "rgba(255,255,255,0.05)" }}>
          <div style={{ background: "#fff", padding: "5px", borderRadius: "6px", marginBottom: "auto" }}>
            <TicketQR size={75} variant="dark" />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", paddingBottom: "10px" }}>
            <span style={{ writingMode: "vertical-rl", fontSize: "16px", fontWeight: 800 }}>{title}</span>
            <div style={{ width: "1px", height: "50px", background: "#fff", opacity: 0.4 }} />
            <span style={{ writingMode: "vertical-rl", fontSize: "11px", fontWeight: 600, opacity: 0.8 }}>ART EXHIBITION</span>
          </div>
        </div>
      </div>

      {/* 포인트 구체 */}
      <div style={{ position: "absolute", right: "110px", top: "45%", width: "55px", height: "55px", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #ff9a9e, #f761a1)", boxShadow: "0 10px 20px rgba(0,0,0,0.2)", zIndex: 2 }} />
    </div>
  );
}