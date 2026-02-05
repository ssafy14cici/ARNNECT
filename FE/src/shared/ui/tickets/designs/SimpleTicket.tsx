// tickets/designs/MuseumClassicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR"; // QR 컴포넌트 경로 확인 필요

export default function MuseumClassicTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ART MUSEUM\nNEW EXPOSITION").toUpperCase();

  return (
    <div style={{
      width: "100%", 
      height: "100%", 
      backgroundColor: "#F9F8FF", 
      color: "#4A4EB2", 
      display: "flex", 
      fontFamily: "'Times New Roman', serif", 
      position: "relative",
      overflow: "hidden",
    }}>
      {/* 1. 왼쪽 메인 영역 (75%) */}
      <div style={{ 
        flex: 3, 
        padding: "30px 40px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* 타이틀 영역 */}
        <div style={{ zIndex: 2 }}>
          <h1 style={{ 
            fontSize: "38px", 
            margin: 0, 
            lineHeight: 1.1, 
            fontWeight: "normal",
            whiteSpace: "pre-line",
            letterSpacing: "1px"
          }}>
            {title}
          </h1>
        </div>

        {/* 중단 배지 영역 (날짜 정보 교체) */}
        <div style={{ display: "flex", gap: "10px", zIndex: 2 }}>
          {/* 시작 날짜 박스 */}
          <div style={{ 
            backgroundColor: "#5D5FBB", 
            color: "#fff", 
            padding: "12px 20px",
            fontSize: "18px",
            minWidth: "130px",
            textAlign: "center",
            fontWeight: "bold"
          }}>
            {data.startDate || "START DATE"}
          </div>
          {/* 종료 날짜 박스 (기존 Ticket:$10 위치) */}
          <div style={{ 
            backgroundColor: "#5D5FBB", 
            color: "#fff", 
            padding: "12px 20px",
            fontSize: "18px",
            flex: 1,
            textAlign: "center",
            fontWeight: "bold"
          }}>
            {data.endDate ? `UNTIL ${data.endDate}` : "END DATE"}
          </div>
        </div>

        {/* 하단 장소 & 시간 (웹사이트 주소 대신 장소 입력) */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-end",
          fontSize: "13px", 
          fontWeight: "bold",
          zIndex: 2,
          borderTop: "1px solid rgba(74, 78, 178, 0.2)",
          paddingTop: "10px"
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "10px", opacity: 0.7 }}>LOCATION</span>
            <span>{data.address} {data.addressDetail}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "block", fontSize: "10px", opacity: 0.7 }}>TIME</span>
            <span>{data.startTime} - {data.endTime}</span>
          </div>
        </div>

        {/* 중앙 조각상 배경 (디자인 요소) */}
        <div style={{
          position: "absolute",
          right: "10%",
          top: "45%",
          transform: "translateY(-50%)",
          width: "180px",
          height: "220px",
          opacity: 0.6,
          zIndex: 1,
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
             <div style={{ 
               width: "110px", height: "150px", 
               borderRadius: "60px 60px 0 0", 
               border: "1px solid #D1D1F5",
               background: "linear-gradient(to bottom, #EFEEFF, #D1D1F5)"
             }} />
             <div style={{ position: 'absolute', top: 0, right: 40, color: '#5D5FBB', fontSize: '20px' }}>✦</div>
             <div style={{ position: 'absolute', bottom: 60, left: -10, color: '#5D5FBB', fontSize: '14px' }}>✦</div>
          </div>
        </div>
      </div>

      {/* 2. 중앙 절취선 영역 */}
      <div style={{ 
        width: "20px", 
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ height: "90%", borderLeft: "1.5px dashed rgba(93, 95, 187, 0.4)" }} />
      </div>

      {/* 3. 오른쪽 스텁 영역 (QR 코드 배치) */}
      <div style={{ 
        flex: 0.8, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "space-between",
        padding: "25px 15px",
        background: "rgba(93, 95, 187, 0.03)"
      }}>
        {/* QR 코드 영역 (절취선 오른쪽 상단/중앙) */}
        <div style={{ 
          background: "#fff", 
          padding: "8px", 
          borderRadius: "8px", 
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          border: "1px solid #EEE" 
        }}>
          <TicketQR size={90} variant="dark" />
        </div>

        {/* 하단 바코드 및 텍스트 */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ display: 'flex', gap: '2px', height: '40px' }}>
            {[1, 3, 1, 5, 2, 4, 1, 2, 6, 1, 3].map((w, i) => (
              <div key={i} style={{ width: `${w}px`, height: '100%', backgroundColor: '#5D5FBB' }} />
            ))}
          </div>
          <span style={{ fontSize: "9px", letterSpacing: "1px", opacity: 0.7 }}>STUB ONLY</span>
        </div>
      </div>
    </div>
  );
}