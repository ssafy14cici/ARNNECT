// tickets/designs/DancePinkTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function DancePinkTicket({ data }: TicketDesignProps) {
  const title = (data.title || "DANCE").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#FF7EB3", // 메인 핑크 배경
        color: "#000",
        display: "flex",
        fontFamily: "'Courier New', Courier, monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 왼쪽 메인 영역 */}
      <div style={{ 
        flex: 1, 
        padding: "24px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        position: "relative" 
      }}>
        
        {/* [상단] 타이틀 및 날짜/시간 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ 
              fontSize: "48px", 
              fontWeight: "900", 
              margin: 0, 
              lineHeight: 0.8, 
              letterSpacing: "-2px",
              fontFamily: "Arial Black, sans-serif" 
            }}>
              {title}
            </h1>
            <div style={{ fontSize: "11px", fontWeight: "900", marginTop: "10px", lineHeight: 1.2 }}>
              PERFORMANCE ART<br />& CEREMONY
            </div>
          </div>
          
          <div style={{ textAlign: "right", fontSize: "18px", fontWeight: "900" }}>
            {data.startDate} <br />
            <span style={{ fontSize: "14px" }}>{data.startTime}</span>
          </div>
        </div>

        {/* [중앙] 이미지 테두리 박스 및 장소 정보 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", margin: "15px 0" }}>
          {/* 사진이 들어가는 네모 테두리 */}
          <div style={{ 
            width: "100%", 
            height: "140px", 
            border: "3px solid #000", 
            backgroundColor: "#fff",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}>
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="dance" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: "12px", fontWeight: "900", textAlign: "center" }}>
                PHOTO AREA
              </div>
            )}
          </div>

          {/* [수정] 전시장소 배치 */}
          <div style={{ 
            backgroundColor: "#000", 
            color: "#FF7EB3", 
            padding: "4px 8px", 
            fontSize: "14px", 
            fontWeight: "900",
            width: "fit-content"
          }}>
            LOCATION: {data.address} {data.addressDetail}
          </div>
        </div>

        {/* [하단] 하이라이트 문구 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "12px", fontWeight: "900", borderTop: "2px solid #000", paddingTop: "5px" }}>
             ADMIT ONE ONLY
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "serif", fontSize: "18px", fontStyle: "italic", lineHeight: 1 }}>Special Dance</div>
            <div style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "1px" }}>AWARD CEREMONIES</div>
          </div>
        </div>
      </div>

      {/* 2. 우측 화이트 스텁 (Stub) */}
      <div style={{ 
        width: "110px", 
        backgroundColor: "#fff", 
        borderLeft: "3px solid #000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 0"
      }}>
        {/* QR 코드 */}
        <div style={{ background: "#000", padding: "4px", borderRadius: "4px" }}>
          <TicketQR size={70} variant="light" />
        </div>

        {/* 세로 바코드 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
           <div style={{ 
             width: "50px", 
             height: "100px", 
             background: "repeating-linear-gradient(180deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px)"
           }} />
           <span style={{ fontSize: "9px", fontWeight: "bold" }}>STUB-2026-VOID</span>
        </div>

        <div style={{ fontWeight: "900", fontSize: "11px", letterSpacing: "-0.5px" }}>
          @TICKET_DESIGN
        </div>
      </div>

      {/* 절취선 점선 */}
      <div style={{ 
        position: "absolute", 
        right: "110px", 
        top: 0, 
        bottom: 0, 
        borderLeft: "2px dashed rgba(0,0,0,0.3)" 
      }} />
    </div>
  );
}