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
          justifyContent: "center", // ✅ 텍스트 제거했으니 중앙 정렬
          padding: "18px 10px",
          boxSizing: "border-box",
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px",
            borderRadius: "6px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
          }}
        >
          <TicketQR size={78} variant="dark" />
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
        {/* POSTER (테두리 제거) */}
        <div
          style={{
            height: "52%",
            width: "100%",
            backgroundColor: "#D1CDC4",
            borderRadius: "8px",
            overflow: "hidden",
            // ✅ border 제거
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
              overflowWrap: "anywhere",
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
              gap: 8,
              minHeight: 0,
            }}
          >
            {/* LOCATION */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {address || "LOCATION"}
            </div>

            {/* DATE + TIME */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#FFF",
                  backgroundColor: "#FF3B30",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                {startDate || "START"}
                {endDate ? `  ▶  ${endDate}` : ""}
              </div>

              {(startTime || endTime) && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#FF3B30",
                    border: "2px solid #FF3B30",
                    padding: "5px 10px",
                    borderRadius: 8,
                    background: "rgba(255,59,48,0.06)",
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
