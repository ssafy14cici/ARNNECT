// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function HoloAbstractTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ABSTRACT").toUpperCase();

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
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 38%, #ec4899 70%, #f43f5e 100%)",
      }}
    >
      {/* 배경 오버레이 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1), transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ✅ TOP: 포스터 영역 (이미지 칸 유지) */}
        <div style={{ flex: 1.2, position: "relative", overflow: "hidden" }}>
          {data.posterUrl ? (
            <img
              src={data.posterUrl}
              alt="poster"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", fontSize: 12, opacity: 0.5 }}>
              NO IMAGE
            </div>
          )}
          
          {/* QR 코드: 이미지 위에 작게 배치 (좌측 상단) */}
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              background: "rgba(255, 255, 255, 0.9)",
              padding: "5px",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <TicketQR size={50} variant="dark" />
          </div>
        </div>

        {/* ✅ BOTTOM: 정보 패널 (제목 포함) */}
        <div
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(12px)",
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            borderTop: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {/* 전시 제목 */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.8px",
              marginBottom: 12,
              wordBreak: "keep-all",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </div>

          {/* 상세 정보 로우 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 일시 */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, background: "#fff", color: "#000", padding: "4px 10px", borderRadius: 6 }}>
                {startDate || "DATE"} {endDate ? `~ ${endDate}` : ""}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
                {startTime || "00:00"} {endTime ? `- ${endTime}` : ""}
              </div>
            </div>

            {/* 장소 */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                opacity: 0.85,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>LOC</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {address || "VENUE LOCATION"}
              </span>
            </div>
          </div>

          {/* 하단 데코 라인 */}
          <div
            style={{
              marginTop: 15,
              height: 4,
              width: "100%",
              opacity: 0.3,
              background: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 6px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}