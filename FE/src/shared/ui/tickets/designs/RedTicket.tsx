// tickets/designs/MilesToGoTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function MilesToGoTicket({ data }: TicketDesignProps) {
  const title = (data.title || "RED EXHIBITION").toUpperCase();

  const startDate = data.startDate || "";
  const endDate = data.endDate || "";
  const startTime = data.startTime || "";
  const endTime = data.endTime || "";
  const address = [data.address, data.addressDetail].filter(Boolean).join(" ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#E5E1D8",
        color: "#FF3B30",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Arial Black', sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* 1. TOP POSTER: 테두리 없이 깔끔하게 상단 배치 */}
      <div
        style={{
          width: "100%",
          height: "55%",
          backgroundColor: "#D1CDC4",
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      >
        {data.posterUrl ? (
          <img
            src={data.posterUrl}
            alt="poster"
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover", 
              display: "block" 
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              opacity: 0.35,
              fontSize: 14,
            }}
          >
            NO IMAGE
          </div>
        )}
      </div>

      {/* 2. BOTTOM CONTENT: 텍스트 정보와 QR 코드 결합 */}
      <div 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          marginTop: 18,
          minHeight: 0 
        }}
      >
        {/* TITLE SECTION */}
        <h1
          style={{
            fontSize: "36px",
            lineHeight: 1.0,
            margin: "0 0 16px 0",
            fontWeight: 900,
            letterSpacing: "-1.5px",
            textTransform: "uppercase",
            wordBreak: "keep-all",
          }}
        >
          {title}
        </h1>

        <div 
          style={{ 
            flex: 1,
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-end", // 하단 정렬
            borderTop: "3px solid #FF3B30",
            paddingTop: 16
          }}
        >
          {/* LEFT: INFO SECTION (장소, 날짜, 시간) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "280px"
              }}
            >
              📍 {address || "LOCATION"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#FFF",
                  backgroundColor: "#FF3B30",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  width: "fit-content"
                }}
              >
                {startDate || "START"}
                {endDate ? `  ▶  ${endDate}` : ""}
              </div>

              {(startTime || endTime) && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#FF3B30",
                    border: "1.5px solid #FF3B30",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,59,48,0.04)",
                    width: "fit-content"
                  }}
                >
                  {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
                </div>
              )}
            </div>
          </div>

          {/* ✅ RIGHT BOTTOM: QR CODE 위치 */}
          <div
            style={{
              padding: "6px",
              backgroundColor: "#FFF",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 16,
              flexShrink: 0,
            }}
          >
            <TicketQR size={72} variant="dark" />
          </div>
        </div>
      </div>

      {/* 절취선 데코레이션 (하단부 위치) */}
      <div 
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          borderTop: "1.5px dashed rgba(255,59,48,0.2)",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}