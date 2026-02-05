// tickets/designs/DancePinkTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function DancePinkTicket({ data }: TicketDesignProps) {
  const title = (data.title || "DANCE").toUpperCase();

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
        backgroundColor: "#FF7EB3",
        color: "#000",
        display: "flex",
        fontFamily: "'Courier New', Courier, monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* LEFT MAIN */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          minHeight: 0,
        }}
      >
        {/* TOP */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: "44px",
                fontWeight: 900,
                margin: 0,
                lineHeight: 0.85,
                letterSpacing: "-2px",
                fontFamily: "Arial Black, sans-serif",
                wordBreak: "keep-all",
              }}
            >
              {title}
            </h1>
            <div style={{ fontSize: "11px", fontWeight: 900, marginTop: 8, lineHeight: 1.2 }}>
              PERFORMANCE ART<br />& CEREMONY
            </div>
          </div>

          {/* 날짜/시간(끝나는 날짜 포함) */}
          <div style={{ textAlign: "right", fontSize: 14, fontWeight: 900, lineHeight: 1.25 }}>
            <div>{startDate || "DATE"}</div>
            {endDate && <div style={{ fontSize: 12, opacity: 0.9 }}>~ {endDate}</div>}
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12 }}>{startTime || "--:--"}</span>
              {endTime ? <span style={{ fontSize: 12 }}> - {endTime}</span> : null}
            </div>
          </div>
        </div>

        {/* MID */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
            margin: "12px 0",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 120,
              border: "3px solid #000",
              backgroundColor: "#fff",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxSizing: "border-box",
              flex: "0 0 auto",
            }}
          >
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="dance" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ fontSize: 12, fontWeight: 900, textAlign: "center" }}>PHOTO AREA</div>
            )}
          </div>

          {/* LOCATION (반드시 보이도록) */}
          <div
            style={{
              backgroundColor: "#000",
              color: "#FF7EB3",
              padding: "6px 10px",
              fontSize: 13,
              fontWeight: 900,
              width: "100%",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            LOCATION: {address || "LOCATION"}
          </div>
        </div>

        {/* BOTTOM */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, borderTop: "2px solid #000", paddingTop: 6 }}>
            ADMIT ONE ONLY
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "serif", fontSize: 16, fontStyle: "italic", lineHeight: 1 }}>
              Special Dance
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1 }}>AWARD CEREMONIES</div>
          </div>
        </div>
      </div>

      {/* RIGHT STUB */}
      <div
        style={{
          width: "110px",
          backgroundColor: "#fff",
          borderLeft: "3px solid #000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0",
          boxSizing: "border-box",
        }}
      >
        <div style={{ background: "#000", padding: 4, borderRadius: 4 }}>
          <TicketQR size={68} variant="light" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 50,
              height: 92,
              background:
                "repeating-linear-gradient(180deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px)",
            }}
          />
          <span style={{ fontSize: 9, fontWeight: "bold" }}>STUB-2026-VOID</span>
        </div>

        <div style={{ fontWeight: 900, fontSize: 11, letterSpacing: "-0.5px" }}>@TICKET_DESIGN</div>
      </div>

      <div
        style={{
          position: "absolute",
          right: "110px",
          top: 0,
          bottom: 0,
          borderLeft: "2px dashed rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}
