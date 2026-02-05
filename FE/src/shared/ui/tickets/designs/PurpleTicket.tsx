// tickets/designs/WorldMusicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function WorldMusicTicket({ data }: TicketDesignProps) {
  // 타이틀이 세로로 꺾이지 않도록 공백 처리
  const title = (data.title || "WORLD MUSIC DAY").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#E2D1F9", // 메인 연보라 배경
        color: "#0020C2", // 메인 네이비 텍스트 컬러
        display: "flex",
        fontFamily: "'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 좌측 네이비 스텁 (Stub) - QR 코드 배치 */}
      <div style={{ 
        width: "120px", 
        backgroundColor: "#0020C2", 
        color: "#E2D1F9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 10px",
      }}>
        <div style={{ 
          writingMode: "vertical-rl", 
          fontSize: "10px", 
          opacity: 0.7,
          letterSpacing: "1px"
        }}>
          ADMIT ONE / TICKET STUB
        </div>

        {/* [수정] 바코드 대신 QR 코드 배치 */}
        <div style={{ 
          background: "#E2D1F9", 
          padding: "5px", 
          borderRadius: "4px" 
        }}>
          <TicketQR size={80} variant="dark" />
        </div>

        <div style={{ 
          fontSize: "12px", 
          fontWeight: "bold", 
          transform: "rotate(-90deg)",
          whiteSpace: "nowrap"
        }}>
          #{Math.floor(Math.random() * 90000) + 10000}
        </div>
      </div>

      {/* 2. 우측 메인 컨텐츠 영역 */}
      <div style={{ 
        flex: 1, 
        padding: "25px 35px", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* 상단: 타이틀 및 이미지 영역 */}
        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          {/* [수정] 텍스트 자리에 이미지 배치 */}
          <div style={{ 
            width: "180px", 
            height: "180px", 
            backgroundColor: "#D1BEEB",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 8px 20px rgba(0,32,194,0.1)"
          }}>
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="poster" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", opacity: 0.5 }}>
                IMAGE
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            {/* [수정] 전시 제목 가로 배치 */}
            <h1 style={{ 
              fontSize: "48px", 
              lineHeight: 1, 
              margin: "0 0 10px 0", 
              fontWeight: "900",
              letterSpacing: "-1px"
            }}>
              {title}
            </h1>
            <div style={{ width: "60px", height: "6px", backgroundColor: "#0020C2" }} />
          </div>
        </div>

        {/* 하단: 날짜 및 위치 정보 (시인성 강화) */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-end",
          borderTop: "2px solid #0020C2",
          paddingTop: "15px"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", opacity: 0.8 }}>LOCATION</div>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
              {data.address} <span style={{ fontWeight: "normal" }}>{data.addressDetail}</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", opacity: 0.8 }}>DATE & TIME</div>
            <div style={{ fontSize: "18px", fontWeight: "900" }}>
              {data.startDate} {data.endDate && `— ${data.endDate}`}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>
              {data.startTime} - {data.endTime}
            </div>
          </div>
        </div>

        {/* 장식용 수직 점선 */}
        <div style={{ 
          position: "absolute", 
          left: 0, 
          top: "10%", 
          bottom: "10%", 
          borderLeft: "2px dashed rgba(0,32,194,0.2)" 
        }} />
      </div>
    </div>
  );
}