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
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 38%, #ec4899 70%, #f43f5e 100%)",
      }}
    >
      {/* subtle overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 60%)",
          opacity: 0.9,
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
        }}
      >
        {/* LEFT: 포스터 및 핵심 정보 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            overflow: "hidden",
            background: "rgba(255,255,255,0.10)",
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
                objectPosition: "center",
                display: "block",
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
                fontSize: 12,
                opacity: 0.75,
                letterSpacing: 1,
              }}
            >
              POSTER
            </div>
          )}

          {/* 상단 어두운 그라데이션 (제목 가독성 확보) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          {/* ✅ 1. 전시 제목: 상단 배치 및 가독성 강화 */}
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 100, // QR 코드 아래에 위치하도록 조정
              right: 16,
              zIndex: 3,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
                textShadow: "0 4px 12px rgba(0,0,0,0.5)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#FFFFFF",
              }}
            >
              {title}
            </h1>
          </div>

          {/* ✅ 2. QR: 좌상단 (그대로 유지하되 그림자 강화) */}
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 16,
              background: "rgba(255, 255, 255, 0.92)",
              padding: 6,
              borderRadius: 10,
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            }}
          >
            <TicketQR size={60} variant="dark" />
          </div>
        </div>

        {/* RIGHT: 정보 패널 */}
        <div
          style={{
            width: "44%",
            minWidth: 160,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 16,
            boxSizing: "border-box",
            background: "rgba(0,0,0,0.25)", // 배경을 조금 더 어둡게 하여 정보 가독성 높임
            borderLeft: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)", // 뒷배경 블러 처리로 세련된 느낌 추가
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 날짜 박스 */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "rgba(255,255,255,0.15)",
                padding: "8px 12px",
                borderRadius: 8,
                width: "fit-content",
                maxWidth: "100%",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {startDate || "DATE"}
              {endDate ? ` — ${endDate}` : ""}
            </div>

            {/* 시간 박스 */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(255,255,255,0.1)",
                padding: "8px 12px",
                borderRadius: 8,
                width: "fit-content",
              }}
            >
              {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
            </div>

            {/* 장소 정보 */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "0 4px",
                lineHeight: 1.4,
              }}
            >
              <span style={{ opacity: 0.7, fontSize: 10, display: "block" }}>LOCATION</span>
              <div style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {address || "LOCATION"}
              </div>
            </div>
          </div>

          {/* 하단 바코드 스타일 데코 */}
          <div
            style={{
              marginTop: 16,
              height: 20,
              width: "100%",
              opacity: 0.6,
              background:
                "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 6px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}