// tickets/designs/MuseumClassicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";

export default function MuseumClassicTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ART MUSEUM\nNEW EXPOSITION").toUpperCase();

  return (
    <div style={{
      width: "100%", 
      height: "100%", 
      backgroundColor: "#F9F8FF", // 아주 연한 보라빛 백그라운드
      color: "#4A4EB2", // 메인 보라색 텍스트
      display: "flex", 
      fontFamily: "'Times New Roman', serif", // 고전적인 느낌을 위해 세리프체 권장
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
    }}>
      {/* 왼쪽 메인 영역 (75%) */}
      <div style={{ 
        flex: 3, 
        padding: "40px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* 타이틀 영역 */}
        <div style={{ zIndex: 2 }}>
          <h1 style={{ 
            fontSize: "42px", 
            margin: 0, 
            lineHeight: 1.1, 
            fontWeight: "normal",
            whiteSpace: "pre-line",
            letterSpacing: "1px"
          }}>
            {title}
          </h1>
        </div>

        {/* 중단 배지 영역 (가격 & 날짜) */}
        <div style={{ display: "flex", gap: "10px", zIndex: 2 }}>
          <div style={{ 
            backgroundColor: "#5D5FBB", 
            color: "#fff", 
            padding: "15px 30px",
            fontSize: "20px",
            minWidth: "120px",
            textAlign: "center"
          }}>
            TICKET: $10
          </div>
          <div style={{ 
            backgroundColor: "#5D5FBB", 
            color: "#fff", 
            padding: "15px 30px",
            fontSize: "20px",
            flex: 1,
            textAlign: "center"
          }}>
            {data.startDate ? data.startDate.toUpperCase() : "22TH JULY"}
          </div>
        </div>

        {/* 하단 웹사이트 & 시간 */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: "14px", 
          fontWeight: "bold",
          zIndex: 2 
        }}>
          <span>www.artmuseum.com</span>
          <span>From {data.startTime || "12:00 pm"} to {data.endTime || "6:00 pm"}</span>
        </div>

        {/* 중앙 조각상 일러스트 (배경 요소) */}
        <div style={{
          position: "absolute",
          right: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "200px",
          height: "240px",
          opacity: 0.8,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {/* 실제 이미지가 있다면 img 태그로 교체, 없다면 아이콘/도형으로 대체 */}
          <div style={{ position: 'relative' }}>
             {/* 조각상 대신 원형과 선으로 느낌만 구현 */}
             <div style={{ 
               width: "120px", height: "160px", 
               borderRadius: "60px 60px 0 0", 
               border: "2px solid #D1D1F5",
               background: "linear-gradient(to bottom, #EFEEFF, #D1D1F5)"
             }} />
             <div style={{ position: 'absolute', top: -10, right: -20, color: '#5D5FBB', fontSize: '24px' }}>✦</div>
             <div style={{ position: 'absolute', bottom: 40, left: -20, color: '#5D5FBB', fontSize: '18px' }}>✦</div>
          </div>
        </div>
      </div>

      {/* 우측 절취선 */}
      <div style={{ 
        width: "2px", 
        borderLeft: "2px dashed #5D5FBB", 
        margin: "20px 0",
        opacity: 0.3
      }} />

      {/* 오른쪽 스텁 영역 (25%) */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "20px"
      }}>
        {/* 바코드 디자인 */}
        <div style={{ 
          display: "flex", 
          gap: "4px", 
          height: "100%", 
          alignItems: "center",
          position: "relative"
        }}>
           {/* 가로형 텍스트 (바코드 옆 문구) */}
           <div style={{ 
             writingMode: "vertical-rl", 
             fontSize: "10px", 
             color: "#5D5FBB",
             marginRight: "10px",
             lineHeight: 1.5,
             opacity: 0.8
           }}>
             Lorem ipsum dolor sit amet, consectetur<br/>
             adipiscing elit, sed do eiusmod tempor
           </div>

           {/* 바코드 막대들 */}
           <div style={{ display: 'flex', gap: '2px', height: '180px' }}>
              {[2, 5, 2, 8, 3, 6, 2, 4, 7, 2].map((w, i) => (
                <div key={i} style={{ width: `${w}px`, height: '100%', backgroundColor: '#5D5FBB' }} />
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}