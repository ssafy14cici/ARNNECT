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
          gap: 12,
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
                lineHeight: 0.9,
                letterSpacing: "-2px",
                fontFamily: "Arial Black, sans-serif",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {title}
            </h1>
          </div>

          {/* DATE/TIME */}
          <div style={{ textAlign: "right", fontSize: 14, fontWeight: 900, lineHeight: 1.25, flex: "0 0 auto" }}>
            <div>{startDate || "DATE"}</div>
            {endDate && <div style={{ fontSize: 12, opacity: 0.9 }}>~ {endDate}</div>}
            <div style={{ marginTop: 4, fontSize: 12 }}>
              {startTime || "--:--"} {endTime ? `- ${endTime}` : ""}
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
          }}
        >
          {/* IMAGE SLOT */}
          <div
            style={{
              width: "100%",
              height: 180,
              backgroundColor: "#fff",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxSizing: "border-box",
              borderRadius: 10,
              boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
            }}
          >
            {data.posterUrl ? (
              <img
                src={data.posterUrl}
                alt="dance"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ fontSize: 12, fontWeight: 900, textAlign: "center", opacity: 0.65 }}>PHOTO</div>
            )}
          </div>

          {/* LOCATION */}
          <div
            style={{
              backgroundColor: "#000",
              color: "#FF7EB3",
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 900,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 10,
              lineHeight: 1.25,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span style={{ opacity: 0.9, marginRight: 6 }}>LOCATION</span>
            {address || "LOCATION"}
          </div>
        </div>

        {/* BOTTOM */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            gap: 10,
            borderTop: "2px solid rgba(0,0,0,0.5)",
            paddingTop: 8,
            fontSize: 11,
            fontWeight: 900,
            opacity: 0.85,
          }}
        >
          {endDate ? `${startDate} ~ ${endDate}` : startDate || "DATE"}
        </div>
      </div>

      {/* ✅ RIGHT STUB (QR 배경 수정됨) */}
      <div
        style={{
          width: "110px",
          backgroundColor: "#fff",
          borderLeft: "3px solid #000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 0",
          boxSizing: "border-box",
          gap: 12,
        }}
      >
        {/* 상단 텍스트 데코 */}
        <div style={{ fontSize: 10, fontWeight: 900, transform: "rotate(0deg)", opacity: 0.8 }}>
          ADMIT ONE
        </div>

        {/* ✅ QR 영역: 검은 배경 제거 및 흰 바탕에 깔끔하게 배치 */}
        <div 
          style={{ 
            padding: 8, 
            backgroundColor: "#fff", 
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "1px solid #f0f0f0"
          }}
        >
          <TicketQR size={78} variant="dark" />
        </div>

        {/* 하단 텍스트 데코 */}
        <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.8 }}>
          ENTRY TICKET
        </div>
      </div>

      {/* perforation */}
      <div
        style={{
          position: "absolute",
          right: "110px",
          top: 0,
          bottom: 0,
          borderLeft: "2px dashed rgba(0,0,0,0.15)",
          zIndex: 2,
        }}
      />
    </div>
  );
}