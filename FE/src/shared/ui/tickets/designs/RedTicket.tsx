// tickets/designs/MilesToGoTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function MilesToGoTicket({ data }: TicketDesignProps) {
  const title = (data.title || "RED EXHIBITION").toUpperCase();

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
      {/* 1. 좌측 레드 스텁 (Stub) - QR 코드 배치 */}
      <div style={{ 
        width: "120px", 
        backgroundColor: "#FF3B30", 
        color: "#FFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 10px",
        position: "relative"
      }}>
        <div style={{ 
          writingMode: "vertical-rl", 
          fontSize: "12px", 
          fontWeight: "bold",
          letterSpacing: "2px",
          opacity: 0.9
        }}>
          ENTRY PASS / RED EXH
        </div>

        {/* [수정] 바코드 자리에 QR 코드 생성 */}
        <div style={{ 
          backgroundColor: "#FFF", 
          padding: "6px", 
          borderRadius: "4px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>
          <TicketQR size={75} variant="dark" />
        </div>

        <div style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "1px" }}>
          A-25-VOID
        </div>
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        position: "relative",
        padding: "25px 30px"
      }}>
        {/* [상단] 이미지 섹션 (포스터가 가장 잘 보이게 배치) */}
        <div style={{ 
          flex: 1,
          width: "100%",
          backgroundColor: "#D1CDC4",
          borderRadius: "4px",
          overflow: "hidden",
          border: "2px solid #FF3B30",
          position: "relative"
        }}>
          {data.posterUrl ? (
            <img 
              src={data.posterUrl} 
              alt="poster" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", opacity: 0.3 }}>
              NO IMAGE
            </div>
          )}
          
          {/* 이미지 위 그래픽 포인트 */}
          <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "5px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: "8px", height: "8px", backgroundColor: "#FF3B30", borderRadius: "50%" }} />
            ))}
          </div>
        </div>

        {/* [하단] 타이틀 및 상세 정보 섹션 */}
        <div style={{ marginTop: "20px" }}>
          <h1 style={{ 
            fontSize: "42px", 
            lineHeight: 1, 
            margin: "0 0 15px 0", 
            fontWeight: "900", 
            letterSpacing: "-2px",
            textTransform: "uppercase"
          }}>
            {title}
          </h1>

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "5px",
            borderTop: "3px solid #FF3B30",
            paddingTop: "15px"
          }}>
            {/* 전시장소 정보 */}
            <div style={{ fontSize: "16px", fontWeight: "900" }}>
              📍 {data.address} {data.addressDetail}
            </div>
            
            {/* 날짜 정보 (시작일/종료일 강조) */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px",
              fontSize: "18px", 
              fontWeight: "900",
              color: "#FFF",
              backgroundColor: "#FF3B30",
              width: "fit-content",
              padding: "4px 10px",
              marginTop: "5px"
            }}>
              <span>{data.startDate}</span>
              {data.endDate && (
                <>
                  <span style={{ fontSize: "12px" }}>▶</span>
                  <span>{data.endDate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 장식용 우하단 점 패턴 */}
        <div style={{ 
          position: "absolute", 
          right: "20px", 
          bottom: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 6px)",
          gap: "4px",
          opacity: 0.5
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ width: "6px", height: "6px", backgroundColor: "#FF3B30", borderRadius: "50%" }} />
          ))}
        </div>
      </div>
    </div>
  );
}