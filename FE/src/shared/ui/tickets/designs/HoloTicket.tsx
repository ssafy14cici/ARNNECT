// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function HoloAbstractTicket({ data }: TicketDesignProps) {
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
        background:
          "linear-gradient(135deg, #6366f1 0%, #a855f7 38%, #ec4899 70%, #f43f5e 100%)",
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
          flexDirection: "column",
        }}
      >
        {/* ✅ TOP: 가로로 크게 포스터 */}
        <div
          style={{
            position: "relative",
            height: "52%", // 포스터 비중 크게 (원하면 55~65%까지 올려도 됨)
            width: "100%",
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
                objectFit: "cover", // 가로로 꽉 차게
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

          {/* 포스터 위 살짝 그라데이션 (텍스트 읽힘/분위기) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.28) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* ✅ QR은 유지 (원하면 제거 가능) */}
          <div
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              background: "rgba(255, 255, 255, 0.18)",
              padding: 6,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "none",
            }}
          >
            <TicketQR size={62} variant="light" />
          </div>
        </div>

        {/* BOTTOM: 정보 영역 (ABSTRACT/10:00 같은 “타이틀/시간 단독 텍스트” 제거) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: 18,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* info chips */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "rgba(0,0,0,0.22)",
                padding: "7px 10px",
                borderRadius: 8,
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              {startDate || "DATE"}
              {endDate ? ` — ${endDate}` : ""}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(0,0,0,0.18)",
                padding: "7px 10px",
                borderRadius: 8,
                width: "fit-content",
              }}
            >
              {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.95,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ opacity: 0.8 }}>Location:</span>{" "}
              {address || "LOCATION"}
            </div>
          </div>

          {/* bottom barcode */}
          <div
            style={{
              height: 18,
              width: 220,
              opacity: 0.9,
              background:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 2px, transparent 2px, transparent 6px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
