// tickets/designs/EarthDayTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function EarthDayTicket({ data }: TicketDesignProps) {
  const title = (data.title || "HAPPY EARTH\nDAY!").toUpperCase();
  const year = "2024"; // 이미지 상의 연도 고정 또는 데이터에서 추출

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#F5EFE6", // 부드러운 베이지 배경
        color: "#000",
        display: "flex",
        fontFamily: "'Inter', 'Arial Black', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 좌측 블랙 스텁 (Stub) */}
      <div style={{ 
        width: "130px", 
        backgroundColor: "#1A1A1A", // 진한 검정색 배경
        color: "#FFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative"
      }}>
        {/* 바코드와 수직 텍스트 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "100%" }}>
          <div style={{ 
            writingMode: "vertical-rl", 
            fontSize: "9px", 
            opacity: 0.7,
            lineHeight: 1.4,
            textAlign: "left" 
          }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.<br/>
            Invel nisi faucibus, pharetra elit eu, consequat ipsum.<br/>
            Proin at iaculis tellus, nec sollicitudin tortorvallis est.
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            {/* 바코드 영역 */}
            <div style={{ 
              width: "60px", 
              height: "180px", 
              backgroundColor: "#FFF",
              display: "flex",
              padding: "0 5px",
              gap: "2px"
            }}>
              {[3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4].map((w, i) => (
                <div key={i} style={{ flex: w, height: "100%", backgroundColor: "#000" }} />
              ))}
            </div>
            <span style={{ fontSize: "11px", fontWeight: "bold", transform: "rotate(90deg)", marginTop: "10px", whiteSpace: "nowrap" }}>
              NO. 123456789000
            </span>
          </div>
        </div>

        {/* 절취용 보라색 점선 */}
        <div style={{
          position: "absolute",
          right: "-3px",
          top: 0,
          bottom: 0,
          width: "6px",
          backgroundImage: "linear-gradient(to bottom, #A855F7 50%, rgba(255,255,255,0) 0%)",
          backgroundPosition: "right",
          backgroundSize: "6px 15px",
          backgroundRepeat: "repeat-y",
          zIndex: 10
        }} />
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div style={{ 
        flex: 1, 
        padding: "40px", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* 상단 타이틀 섹션 */}
        <div>
          <h1 style={{ 
            fontSize: "64px", 
            lineHeight: 0.85, 
            margin: 0, 
            fontWeight: 900, 
            letterSpacing: "-1px",
            fontFamily: "Arial Black, sans-serif"
          }}>
            {title} <span style={{ fontSize: "40px", verticalAlign: "bottom" }}>{year}</span>
          </h1>
          <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: "15px", opacity: 0.8 }}>
            {data.startDate ? data.startDate.toUpperCase() : "22ND OF APRIL"}
          </div>
        </div>

        {/* 하단 위치 및 URL */}
        <div style={{ fontSize: "14px", fontWeight: "bold" }}>
          <div style={{ marginBottom: "5px", textTransform: "uppercase" }}>{data.address || "YOUR LOCATION"}</div>
          <div style={{ opacity: 0.7 }}>WWW.EARTHDAY2024.COM</div>
        </div>

        {/* 지구 캐릭터 일러스트 (우측 배치) */}
        <div style={{
          position: "absolute",
          right: "-20px",
          bottom: "-20px",
          width: "320px",
          height: "320px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          zIndex: 1
        }}>
          {data.posterUrl ? (
            <img src={data.posterUrl} alt="earth-char" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            /* 지구 캐릭터 임시 SVG */
            <svg viewBox="0 0 100 100" style={{ width: "90%", height: "90%" }}>
              <circle cx="50" cy="50" r="40" fill="#4B8BBE" stroke="#000" strokeWidth="2" />
              <path d="M30 30 Q 50 10 70 30" fill="#6A994E" />
              <path d="M20 60 Q 50 80 80 60" fill="#6A994E" />
              <circle cx="40" cy="45" r="5" fill="#000" />
              <circle cx="60" cy="45" r="5" fill="#000" />
              <path d="M45 60 Q 50 65 55 60" stroke="#000" strokeWidth="2" fill="none" />
              <path d="M85 45 L 95 35 M 85 55 L 95 65" stroke="#FDBA74" strokeWidth="3" /> {/* 별 장식 */}
            </svg>
          )}
        </div>

        {/* QR 코드 (메인 영역 하단에 작게 배치) */}
        <div style={{ position: "absolute", right: "40px", top: "40px" }}>
          <TicketQR size={60} variant="dark" />
        </div>
      </div>
    </div>
  );
}