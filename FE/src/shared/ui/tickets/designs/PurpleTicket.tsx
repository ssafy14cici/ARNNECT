// tickets/designs/WorldMusicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function WorldMusicTicket({ data }: TicketDesignProps) {
  // 타이틀이 길 경우 줄바꿈 처리
  const title = data.title || "World\nMusic\nDay";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#E2D1F9", // 메인 연보라 배경
        color: "#0020C2", // 메인 네이비 텍스트 컬러
        display: "flex",
        fontFamily: "'Times New Roman', serif", // 세리프체 적용
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 좌측 네이비 스텁 (Stub) */}
      <div style={{ 
        width: "140px", 
        backgroundColor: "#0020C2", 
        color: "#E2D1F9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative"
      }}>
        {/* 바코드와 수직 텍스트 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
          <div style={{ 
            writingMode: "vertical-rl", 
            fontSize: "10px", 
            opacity: 0.8,
            textAlign: "center" 
          }}>
            Lorem ipsum dolor sit amet, consectetur<br/>
            adipiscing elit, sed do eiusmod tempor
          </div>
          
          {/* 바코드 영역 */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            gap: "5px"
          }}>
            <div style={{ 
              width: "65px", 
              height: "180px", 
              backgroundColor: "#E2D1F9",
              display: "flex",
              padding: "0 4px",
              gap: "2px"
            }}>
              {/* 바코드 선들 */}
              {[2, 1, 4, 1, 2, 3, 1, 5, 1, 2, 4].map((w, i) => (
                <div key={i} style={{ flex: w, height: "100%", backgroundColor: "#0020C2" }} />
              ))}
            </div>
            <span style={{ fontSize: "12px", fontWeight: "bold", transform: "rotate(90deg)", marginTop: "15px" }}>
              40181 700982
            </span>
          </div>
        </div>
      </div>

      {/* 2. 우측 메인 컨텐츠 영역 */}
      <div style={{ 
        flex: 1, 
        padding: "30px 40px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* 중앙 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <h1 style={{ 
            fontSize: "72px", 
            lineHeight: 0.9, 
            margin: 0, 
            fontWeight: "normal",
            whiteSpace: "pre-line",
          }}>
            {title}
          </h1>

          {/* 중앙 수직 바(Bar) */}
          <div style={{ width: "8px", height: "160px", backgroundColor: "#0020C2" }} />
          
          {/* 일러스트 영역 */}
          <div style={{ width: "180px", height: "180px" }}>
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="poster" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              /* 캐릭터 대용 벡터 아이콘 느낌 */
              <svg viewBox="0 0 100 100" fill="none" stroke="#0020C2" strokeWidth="2">
                <path d="M30 70 Q 50 20 70 70" />
                <circle cx="70" cy="70" r="10" />
                <path d="M20 40 Q 40 10 60 40 T 100 40" strokeDasharray="2 2" />
              </svg>
            )}
          </div>
        </div>

        {/* 우상단/우하단 날짜 정보 */}
        <div style={{ 
          position: "absolute", 
          right: "30px", 
          top: "0", 
          bottom: "0", 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "space-between",
          padding: "30px 0",
          textAlign: "right",
          fontSize: "18px",
          fontWeight: "bold"
        }}>
          <div>From 21st<br/>to 23rd</div>
          
          {/* 하단 QR 및 날짜 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "15px" }}>
            <TicketQR size={50} variant="dark" />
            <div>From 21st<br/>to 23rd</div>
          </div>
        </div>
      </div>
    </div>
  );
}