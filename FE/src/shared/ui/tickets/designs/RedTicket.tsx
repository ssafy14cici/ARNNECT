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
        fontFamily: "'Inter', 'Arial Black', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* LEFT STUB: 불필요한 텍스트 제거 및 QR 중앙 정렬 */}
      <div
        style={{
          width: "120px",
          backgroundColor: "#FF3B30",
          color: "#FFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center", // ✅ 텍스트가 없으므로 정중앙 배치
          padding: "18px 10px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            backgroundColor: "#FFF",
            padding: "8px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TicketQR size={80} variant="dark" />
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "22px 24px",
          boxSizing: "border-box",
          minHeight: 0,
        }}
      >
        {/* POSTER: 빨간 테두리 제거 */}
        <div
          style={{
            height: "52%",
            width: "100%",
            backgroundColor: "#D1CDC4",
            borderRadius: "12px",
            overflow: "hidden",
            // ✅ 기존 border 관련 설정 완전 제거
            position: "relative",
            boxSizing: "border-box",
            flex: "0 0 auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.08)", // 포스터를 띄워주기 위한 미세한 그림자 추가
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
                letterSpacing: 1,
              }}
            >
              NO IMAGE
            </div>
          )}
        </div>

        {/* INFO */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 16, display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              fontSize: "36px",
              lineHeight: 0.9,
              margin: "0 0 12px 0",
              fontWeight: 900,
              letterSpacing: "-1.5px",
              textTransform: "uppercase",
              wordBreak: "keep-all",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </h1>

          <div
            style={{
              borderTop: "3px solid #FF3B30",
              paddingTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 0,
            }}
          >
            {/* LOCATION */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              📍 {address || "LOCATION"}
            </div>

            {/* DATE + TIME */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#FFF",
                  backgroundColor: "#FF3B30",
                  padding: "7px 12px",
                  borderRadius: "8px",
                }}
              >
                {startDate || "START DATE"}
                {endDate ? `  ▶  ${endDate}` : ""}
              </div>

              {(startTime || endTime) && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#FF3B30",
                    border: "2px solid #FF3B30",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,59,48,0.04)",
                  }}
                >
                  {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}