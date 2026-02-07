// tickets/designs/MuseumClassicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function MuseumClassicTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ART MUSEUM\nNEW EXPOSITION").toUpperCase();

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
        backgroundColor: "#F9F8FF",
        color: "#4A4EB2",
        display: "flex",
        fontFamily: "'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* LEFT MAIN */}
      <div
        style={{
          flex: 3,
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          boxSizing: "border-box",
          minHeight: 0,
          minWidth: 0,
          gap: 14,
        }}
      >
        {/* TITLE */}
        <div style={{ zIndex: 2 }}>
          <h1
            style={{
              fontSize: 34,
              margin: 0,
              lineHeight: 1.1,
              fontWeight: 500,
              whiteSpace: "pre-line",
              letterSpacing: 1,
              wordBreak: "keep-all",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </h1>
        </div>

        {/* POSTER SLOT */}
        <div
          style={{
            zIndex: 2,
            width: "100%",
            height: 190,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(74, 78, 178, 0.18)",
            background: "linear-gradient(135deg, rgba(93,95,187,0.08), rgba(93,95,187,0.02))",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
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
                fontWeight: 700,
                letterSpacing: 2,
                opacity: 0.65,
              }}
            >
              POSTER
            </div>
          )}
        </div>

        {/* ✅ DATE BADGES (두 박스 완전 동일 크기) */}
        <div style={{ display: "flex", gap: 10, zIndex: 2 }}>
          {/* START */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#5D5FBB",
              color: "#fff",
              height: 38,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              boxSizing: "border-box",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {startDate || "START DATE"}
          </div>

          {/* END */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#5D5FBB",
              color: "#fff",
              height: 38,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              boxSizing: "border-box",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {endDate || "END DATE"}
          </div>
        </div>

        {/* LOCATION & TIME */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 13,
            fontWeight: 700,
            zIndex: 2,
            borderTop: "1px solid rgba(74, 78, 178, 0.22)",
            paddingTop: 10,
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 10, opacity: 0.75 }}>LOCATION</span>
            <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {address || "LOCATION"}
            </span>
          </div>

          <div style={{ textAlign: "right", flex: "0 0 auto" }}>
            <span style={{ display: "block", fontSize: 10, opacity: 0.75 }}>TIME</span>
            <span style={{ whiteSpace: "nowrap" }}>
              {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
            </span>
          </div>
        </div>

        {/* DECOR */}
        <div
          style={{
            position: "absolute",
            right: "10%",
            top: "45%",
            transform: "translateY(-50%)",
            width: 160,
            height: 200,
            opacity: 0.55,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div
              style={{
                width: 100,
                height: 140,
                borderRadius: "60px 60px 0 0",
                border: "1px solid #D1D1F5",
                background: "linear-gradient(to bottom, #EFEEFF, #D1D1F5)",
              }}
            />
            <div style={{ position: "absolute", top: 0, right: 35, color: "#5D5FBB", fontSize: 18 }}>✦</div>
            <div style={{ position: "absolute", bottom: 55, left: -10, color: "#5D5FBB", fontSize: 13 }}>✦</div>
          </div>
        </div>
      </div>

      {/* PERFORATION */}
      <div style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: "90%", borderLeft: "1.5px dashed rgba(93, 95, 187, 0.4)" }} />
      </div>

      {/* RIGHT STUB (STUB ONLY 제거) */}
      <div
        style={{
          flex: 0.8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 12px",
          background: "rgba(93, 95, 187, 0.03)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 8,
            borderRadius: 8,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            border: "1px solid #EEE",
          }}
        >
          <TicketQR size={88} variant="dark" />
        </div>
      </div>
    </div>
  );
}
