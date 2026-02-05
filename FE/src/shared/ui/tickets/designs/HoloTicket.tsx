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
      {/* 안전한 오버레이(blur/backdropFilter 제거) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 60%)",
          opacity: 0.9,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%", height: "100%" }}>
        {/* LEFT */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: 18,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          {/* header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <h1
              style={{
                fontSize: 40,
                margin: 0,
                fontWeight: 900,
                letterSpacing: "0.5px",
                lineHeight: 0.95,
                wordBreak: "keep-all",
                textShadow: "0 2px 10px rgba(0,0,0,0.22)",
              }}
            >
              {title}
            </h1>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                padding: 6,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              <TicketQR size={62} variant="light" />
            </div>
          </div>

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

            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.95, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ opacity: 0.8 }}>Location:</span> {address || "LOCATION"}
            </div>
          </div>

          {/* bottom line (바코드 느낌, 너무 무겁지 않게) */}
          <div
            style={{
              height: 18,
              width: 190,
              opacity: 0.9,
              background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 2px, transparent 2px, transparent 6px)",
            }}
          />
        </div>

        {/* RIGHT STUB */}
        <div
          style={{
            width: 140,
            borderLeft: "2.5px dotted rgba(255,255,255,0.45)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.10)",
          }}
        >
          <div style={{ width: "100%", height: "55%", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" }}>
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="stub-poster" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, opacity: 0.7 }}>
                POSTER
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 10, gap: 6 }}>
            <span style={{ writingMode: "vertical-rl", fontSize: 16, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>
              {title}
            </span>
            <div style={{ width: 22, height: 1, background: "rgba(255,255,255,0.9)", opacity: 0.6 }} />
            <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.9 }}>{startTime || "--:--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
