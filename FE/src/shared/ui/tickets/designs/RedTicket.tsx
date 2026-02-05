// tickets/designs/MilesToGoTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";

export default function MilesToGoTicket({ data }: TicketDesignProps) {
  const title = (data.title || "MILES TO GO").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#E5E1D8", // 빈티지한 베이지색 배경
        color: "#FF3B30", // 강렬한 레드 포인트 컬러
        display: "flex",
        fontFamily: "'Inter', 'Arial Black', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 좌측 레드 스텁 (Stub) */}
      <div style={{ 
        width: "100px", 
        backgroundColor: "#FF3B30", 
        color: "#FFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "15px",
        position: "relative"
      }}>
        {/* 바코드와 수직 텍스트 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
           {/* 수직 텍스트 (TICKET NO) */}
           <div style={{ 
            writingMode: "vertical-rl", 
            fontSize: "12px", 
            fontWeight: "bold",
            letterSpacing: "1px"
          }}>
            TICKET NO.1234/A/25-ABC
          </div>

          {/* 화이트 바코드 영역 */}
          <div style={{ 
            width: "50px", 
            height: "180px", 
            backgroundColor: "#FFF",
            display: "flex",
            padding: "0 4px",
            gap: "1px"
          }}>
            {[1, 3, 1, 2, 4, 1, 3, 2, 1, 1, 4, 2].map((w, i) => (
              <div key={i} style={{ flex: w, height: "100%", backgroundColor: "#FF3B30" }} />
            ))}
          </div>
        </div>
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        position: "relative"
      }}>
        {/* 상단 텍스트 영역 */}
        <div style={{ padding: "20px 30px 10px 30px" }}>
          {/* 메인 타이틀 (MILES TO GO) */}
          <h1 style={{ 
            fontSize: "85px", 
            lineHeight: 0.8, 
            margin: 0, 
            fontWeight: "900", 
            letterSpacing: "-4px",
            textAlign: "left"
          }}>
            {title}
          </h1>

          {/* 서브 정보 바 */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "15px", 
            marginTop: "15px",
            fontSize: "14px",
            fontWeight: "800",
            textTransform: "uppercase"
          }}>
            <span>{data.address || "YOUR ADDRESS HERE"}</span>
            <span style={{ fontSize: "20px" }}>✳</span>
            <span>START {data.startTime || "5AM"} - FINISH</span>
            <span style={{ fontSize: "20px" }}>✳</span>
            <span>{data.startDate || "17TH MAY"}</span>
          </div>
        </div>

        {/* 하단 이미지 섹션 (포스터 이미지) */}
        <div style={{ 
          flex: 1, 
          margin: "0 30px 20px 30px", 
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#ccc"
        }}>
          {data.posterUrl ? (
            <img 
              src={data.posterUrl} 
              alt="marathon" 
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%)" }} 
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#555" }} />
          )}

          {/* 이미지 위 그래픽 요소 (원형 링) */}
          <div style={{ 
            position: "absolute", 
            left: "20px", 
            bottom: "20px", 
            display: "flex", 
            gap: "-10px" 
          }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ 
                width: "40px", 
                height: "40px", 
                border: "1px solid #fff", 
                borderRadius: "50%",
                marginLeft: "-15px"
              }} />
            ))}
          </div>

          {/* 우하단 점 패턴 */}
          <div style={{ 
            position: "absolute", 
            right: "20px", 
            bottom: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 10px)",
            gap: "5px"
          }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ width: "10px", height: "10px", backgroundColor: "#FF3B30", borderRadius: "50%" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}