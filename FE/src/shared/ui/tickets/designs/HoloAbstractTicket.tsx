// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function HoloAbstractTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ABSTRACT").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        color: "#fff",
        fontFamily: "'Inter', 'Apple SD Gothic Neo', sans-serif",
        boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
        background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)",
      }}
    >
      {/* 유동적인 홀로그램 배경 배경 */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `
          radial-gradient(circle at 10% 10%, rgba(255, 0, 120, 0.4), transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(253, 224, 71, 0.3), transparent 50%)
        `,
        filter: "blur(20px)",
      }} />

      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
        {/* 왼쪽 메인 컨텐츠 */}
        <div style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {/* 타이틀 (테두리 제거) */}
            <h1 style={{ 
              fontSize: "48px", 
              margin: 0, 
              fontWeight: 900, 
              letterSpacing: "-1px",
              lineHeight: 0.9 
            }}>
              {title}
            </h1>

            {/* 서브 문구 */}
            <div style={{ fontSize: "12px", fontWeight: 700, textAlign: "right", opacity: 0.9 }}>
              ABSTRACT ART<br />EXHIBITION
            </div>
          </div>

          {/* 하단 정보 섹션 */}
          <div style={{ marginBottom: "10px" }}>
            <div style={{ 
              display: "inline-block",
              padding: "4px 12px",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(5px)",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: 700,
              marginBottom: "8px"
            }}>
              {data.startDate} - {data.endDate}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 500, opacity: 0.9 }}>
              <strong>Location:</strong> {data.address} {data.addressDetail}
            </div>
          </div>

          {/* 바코드 장식 */}
          <div style={{ 
            height: "20px", 
            width: "160px", 
            background: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 4px, #fff 4px, #fff 5px)" 
          }} />
        </div>

        {/* 오른쪽 스텁 (Stub) */}
        <div style={{ 
          width: "130px", 
          borderLeft: "2px dotted rgba(255,255,255,0.3)", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          padding: "20px 0",
          background: "rgba(255,255,255,0.05)"
        }}>
          {/* QR 박스 */}
          <div style={{ background: "#fff", padding: "5px", borderRadius: "6px", marginBottom: "auto" }}>
            <TicketQR size={70} variant="dark" />
          </div>

          {/* 세로 텍스트 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", transform: "rotate(0deg)" }}>
            <span style={{ writingMode: "vertical-rl", fontSize: "16px", fontWeight: 800 }}>{title}</span>
            <div style={{ width: "1px", height: "50px", background: "#fff", opacity: 0.5 }} />
            <span style={{ writingMode: "vertical-rl", fontSize: "11px", fontWeight: 500 }}>ART EXHIBITION</span>
          </div>
        </div>
      </div>

      {/* 포인트 구체 오브젝트 */}
      <div style={{
        position: "absolute",
        right: "100px",
        top: "40%",
        width: "55px",
        height: "55px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 30% 30%, #ff99cc, #ff3399)",
        boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}