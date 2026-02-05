// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function HoloAbstractTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ABSTRACT").toUpperCase();

  return (
    <div style={{
      width: "100%", height: "100%",
      borderRadius: 12, overflow: "hidden",
      position: "relative", color: "#fff",
      fontFamily: "'Inter', sans-serif",
      // 더 화려하고 깊이감 있는 홀로그램 배경
      background: "linear-gradient(135deg, #6366f1 0%, #a855f7 40%, #ec4899 70%, #f43f5e 100%)",
    }}>
      {/* 화려한 홀로그램 오로라 효과 */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.6), transparent 50%),
          radial-gradient(circle at 80% 10%, rgba(255, 255, 0, 0.4), transparent 50%),
          radial-gradient(circle at 50% 80%, rgba(0, 255, 100, 0.4), transparent 60%)
        `,
        filter: "blur(30px)", zIndex: 0,
        opacity: 0.8
      }} />

      {/* 유동적인 액체 오브젝트 (애니메이션 느낌 유도) */}
      <svg style={{ position: "absolute", top: "-20%", left: "-10%", width: "120%", height: "140%", filter: "blur(40px)", opacity: 0.5, zIndex: 1 }} viewBox="0 0 200 200">
        <path fill="#fff" d="M45.7,-64.2C58.9,-56.3,69.1,-42.6,73.8,-27.4C78.5,-12.2,77.7,4.5,72.3,19.2C66.9,33.9,56.9,46.6,44.1,55.1C31.3,63.6,15.7,67.9,0.3,67.5C-15.1,67,-30.2,61.9,-43.2,53.2C-56.1,44.5,-67,32.3,-71.4,18.2C-75.8,4.1,-73.7,-11.9,-66.4,-25.1C-59.2,-38.3,-46.8,-48.7,-33.7,-56.7C-20.6,-64.7,-6.8,-70.3,8.3,-68.8C23.4,-67.3,32.5,-72.1,45.7,-64.2Z" transform="translate(100 100)" />
      </svg>

      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", zIndex: 2 }}>
        {/* [좌측] 메인 정보 영역 */}
        <div style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* 타이틀 */}
            <h1 style={{ 
              fontSize: "48px", margin: 0, fontWeight: 900, letterSpacing: "1px", lineHeight: 0.9,
              textShadow: "0 4px 12px rgba(0,0,0,0.2)" 
            }}>{title}</h1>
            
            {/* [수정] 문구 지우고 이 자리에 QR 배치 */}
            <div style={{ 
              background: "rgba(255, 255, 255, 0.15)", 
              padding: "6px", borderRadius: "8px", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)"
            }}>
              <TicketQR size={65} variant="light" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ 
              fontSize: "15px", fontWeight: 800, 
              background: "rgba(255,255,255,0.25)", 
              backdropFilter: "blur(5px)",
              padding: "6px 12px", borderRadius: "6px", width: "fit-content",
              letterSpacing: "0.5px"
            }}>
              {data.startDate} — {data.endDate}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 500, textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
              <span style={{ opacity: 0.8 }}>Location:</span> {data.address} {data.addressDetail}
            </div>
          </div>

          {/* 화이트 바코드 스캔 라인 */}
          <div style={{ 
            height: "24px", width: "200px", opacity: 0.9, 
            background: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 5px, #fff 5px, #fff 6px)" 
          }} />
        </div>

        {/* [우측] 스텁(Stub) 영역 */}
        <div style={{ 
          width: "140px", borderLeft: "2.5px dotted rgba(255,255,255,0.4)", 
          display: "flex", flexDirection: "column", 
          background: "rgba(0,0,0,0.1)", backdropFilter: "blur(2px)"
        }}>
          {/* [수정] 절취선 위 이미지 영역 */}
          <div style={{ 
            width: "100%", height: "55%", 
            backgroundColor: "rgba(255,255,255,0.1)",
            overflow: "hidden"
          }}>
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="stub-poster" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", opacity: 0.5 }}>POSTER</div>
            )}
          </div>

          {/* 스텁 하단 텍스트 정보 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px" }}>
            <span style={{ 
              writingMode: "vertical-rl", fontSize: "18px", fontWeight: 900, 
              letterSpacing: "3px", textTransform: "uppercase" 
            }}>{title}</span>
            <div style={{ width: "20px", height: "1px", background: "#fff", margin: "8px 0", opacity: 0.5 }} />
            <span style={{ fontSize: "10px", fontWeight: 700, opacity: 0.8 }}>{data.startTime}</span>
          </div>
        </div>
      </div>

      {/* 장식용 플로팅 구체 */}
      <div style={{ 
        position: "absolute", right: "120px", top: "40%", width: "60px", height: "60px", 
        borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #fff, #ff00ff)", 
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: 2, opacity: 0.8 
      }} />
    </div>
  );
}