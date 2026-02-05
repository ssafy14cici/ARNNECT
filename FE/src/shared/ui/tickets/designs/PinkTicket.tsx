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
        fontFamily: "'Courier New', Courier, monospace", // 손그림 느낌과 어울리는 폰트
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 왼쪽 메인 영역 */}
      <div style={{ flex: 1, padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        
        {/* 좌상단 타이틀 & 서브 */}
        <div>
          <h1 style={{ 
            fontSize: "44px", 
            fontWeight: "900", 
            margin: 0, 
            lineHeight: 1, 
            letterSpacing: "-2px",
            fontFamily: "Arial Black, sans-serif" 
          }}>
            {title}
          </h1>
          <div style={{ fontSize: "12px", fontWeight: "800", marginTop: "8px", lineHeight: 1.2 }}>
            EXHIBITIONS<br />AND DANCE<br />DINNER
          </div>
        </div>

        {/* 중앙 일러스트 (포스터 이미지가 있으면 출력, 없으면 텍스트로 대체) */}
        <div style={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          width: "60%",
          height: "60%",
          zIndex: 1,
          opacity: 0.9
        }}>
          {data.posterUrl ? (
            <img src={data.posterUrl} alt="dance" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
             <div style={{ border: "2px solid #000", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderStyle: "dashed" }}>
               [ DANCE ILLUSTRATION ]
             </div>
          )}
        </div>

        {/* 하단 정보 영역 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", zIndex: 2 }}>
          <div style={{ fontSize: "14px", fontWeight: "900" }}>
            {data.startDate || "29TH APRIL"}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "serif", fontSize: "20px", fontStyle: "italic", marginBottom: "-4px" }}>Special Dance</div>
            <div style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "1px" }}>AWARD CEREMONIES</div>
          </div>
        </div>

        {/* 우상단 날짜/시간 (이미지 스타일) */}
        <div style={{ position: "absolute", top: "24px", right: "24px", fontSize: "18px", fontWeight: "900" }}>
          {data.startDate ? data.startDate.split('-')[0] : "29/04"} . {data.startTime || "07 PM"}
        </div>
      </div>

      {/* 우측 화이트 스텁 (Stub) */}
      <div style={{ 
        width: "120px", 
        backgroundColor: "#fff", 
        borderLeft: "2px solid #000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 0"
      }}>
        {/* 바코드 (세로형) */}
        <div style={{ transform: "rotate(0deg)", display: "flex", flexDirection: "column", alignItems: "center" }}>
           <div style={{ 
             width: "60px", 
             height: "140px", 
             background: "repeating-linear-gradient(180deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px)",
             marginBottom: "8px"
           }} />
           <span style={{ fontSize: "10px", fontWeight: "bold" }}>40181 700982</span>
        </div>

        {/* QR 코드 (공통 컴포넌트) */}
        <div style={{ marginBottom: "10px" }}>
          <TicketQR size={60} variant="dark" />
        </div>

        {/* 스텁 하단 텍스트 */}
        <div style={{ fontWeight: "900", fontSize: "12px" }}>
          @ddan.d
        </div>
      </div>

      {/* 절취 점선 가이드 (디자인 요소) */}
      <div style={{ 
        position: "absolute", 
        right: "120px", 
        top: 0, 
        bottom: 0, 
        width: "0px", 
        borderLeft: "2px dashed rgba(0,0,0,0.2)" 
      }} />
    </div>
  );
}