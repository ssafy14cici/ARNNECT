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
      {/* LEFT STUB */}
      <div
        style={{
          width: "120px",
          backgroundColor: "#FF3B30",
          color: "#FFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 10px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            writingMode: "vertical-rl",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "2px",
            opacity: 0.9,
          }}
        >
          ENTRY PASS / RED EXH
        </div>

        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px",
            borderRadius: "4px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
          }}
        >
          <TicketQR size={74} variant="dark" />
        </div>

        <div style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "1px" }}>
          A-25-VOID
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
          padding: "18px 22px",
          boxSizing: "border-box",
          minHeight: 0,
        }}
      >
        {/* POSTER (고정 높이로 하단 정보 보장) */}
        <div
          style={{
            height: "52%",
            width: "100%",
            backgroundColor: "#D1CDC4",
            borderRadius: "4px",
            overflow: "hidden",
            border: "2px solid #FF3B30",
            position: "relative",
            boxSizing: "border-box",
            flex: "0 0 auto",
          }}
        >
          {data.posterUrl ? (
            <img
              src={data.posterUrl}
              alt="poster"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
              }}
            >
              NO IMAGE
            </div>
          )}

          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ width: 8, height: 8, backgroundColor: "#FF3B30", borderRadius: "50%" }}
              />
            ))}
          </div>
        </div>

        {/* INFO */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 12, display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              fontSize: "34px",
              lineHeight: 0.95,
              margin: "0 0 10px 0",
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
              borderTop: "3px solid #FF3B30",
              paddingTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minHeight: 0,
            }}
          >
            {/* LOCATION */}
            <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              📍 {address || "LOCATION"}
            </div>

            {/* DATE */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#FFF",
                  backgroundColor: "#FF3B30",
                  padding: "5px 10px",
                  borderRadius: 6,
                }}
              >
                {startDate || "START"}
                {endDate ? `  ▶  ${endDate}` : ""}
              </div>

              {/* TIME (추가) */}
              {(startTime || endTime) && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#FF3B30",
                    border: "2px solid #FF3B30",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(255,59,48,0.06)",
                  }}
                >
                  {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* dots */}
        <div
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            display: "grid",
            gridTemplateColumns: "repeat(4, 6px)",
            gap: 4,
            opacity: 0.5,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, backgroundColor: "#FF3B30", borderRadius: "50%" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
