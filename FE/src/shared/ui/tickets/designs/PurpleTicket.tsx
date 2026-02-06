// tickets/designs/WorldMusicTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function WorldMusicTicket({ data }: TicketDesignProps) {
  const title = (data.title || "WORLD MUSIC DAY").toUpperCase();

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
        backgroundColor: "#E2D1F9",
        color: "#0020C2",
        display: "flex",
        fontFamily: "'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* STUB */}
      <div
        style={{
          width: "120px",
          backgroundColor: "#0020C2",
          color: "#E2D1F9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 10px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ writingMode: "vertical-rl", fontSize: 10, opacity: 0.8, letterSpacing: 1 }}>
          ADMIT ONE / TICKET STUB
        </div>

        <div style={{ background: "#E2D1F9", padding: 5, borderRadius: 4 }}>
          <TicketQR size={78} variant="dark" />
        </div>

        <div style={{ fontSize: 12, fontWeight: "bold", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
          #{Math.floor(Math.random() * 90000) + 10000}
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          minHeight: 0,
          boxSizing: "border-box",
        }}
      >
        {/* TOP (flex:1, minHeight:0 로 하단이 밀려도 잘리지 않게) */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 150,
              height: 150,
              backgroundColor: "#D1BEEB",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 18px rgba(0,32,194,0.10)",
              flex: "0 0 auto",
            }}
          >
            {data.posterUrl ? (
              <img src={data.posterUrl} alt="poster" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, opacity: 0.6 }}>
                IMAGE
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 38,
                lineHeight: 1,
                margin: "0 0 8px 0",
                fontWeight: 900,
                letterSpacing: "-1px",
                wordBreak: "keep-all",
              }}
            >
              {title}
            </h1>
            <div style={{ width: 56, height: 6, backgroundColor: "#0020C2" }} />
          </div>
        </div>

        {/* BOTTOM (반드시 보이도록 padding/폰트 조정) */}
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "2px solid #0020C2",
            paddingTop: 10,
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", opacity: 0.85 }}>LOCATION</div>
            <div style={{ fontSize: 14, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {address || "LOCATION"}
            </div>
          </div>

          <div style={{ textAlign: "right", flex: "0 0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: "bold", opacity: 0.85 }}>DATE & TIME</div>
            <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>
              {startDate || "DATE"} {endDate ? `— ${endDate}` : ""}
            </div>
            <div style={{ fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}>
              {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", borderLeft: "2px dashed rgba(0,32,194,0.2)" }} />
      </div>
    </div>
  );
}
