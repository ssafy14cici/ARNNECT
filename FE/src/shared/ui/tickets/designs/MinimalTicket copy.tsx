import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function MinimalTicket({ data }: TicketDesignProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#fff",
        color: "#222",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        display: "flex",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* 좌측 메인(70%) */}
      <div style={{ flex: 7, padding: 18, position: "relative", boxSizing: "border-box" }}>
        {/* 포스터가 있으면 은은한 원형 장식 */}
        {data.posterUrl ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -30,
              top: -20,
              width: 150,
              height: 150,
              borderRadius: "50%",
              opacity: 0.18,
              filter: "blur(6px)",
              backgroundImage: `url(${data.posterUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : null}

        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            marginTop: 2,
            marginBottom: 10,
            textTransform: "uppercase",
            fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif", // 기존 톤 유지(원하면 변경)
          }}
        >
          {data.title || "EXHIBITION"}
        </div>

        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
          {data.address}
          {data.addressDetail ? `, ${data.addressDetail}` : ""}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1px" }}>{data.startDate}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {data.startTime} - {data.endTime}
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          until <b>{data.endDate}</b>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            backgroundColor: "#ff4d4d",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "1px",
          }}
        >
          OPEN
        </div>
      </div>

      {/* 가운데 절취선 */}
      <div
        style={{
          width: 1,
          backgroundColor: "transparent",
          borderRight: "2px dashed #ddd",
          position: "relative",
          margin: "10px 0",
        }}
      >
        {/* 반원 구멍(배경색 가정: 바깥이 밝으면 #fff로 바꾸면 자연스러움) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 18,
            left: -10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "#fff",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 18,
            left: -10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "#fff",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
      </div>

      {/* 우측 스텁(30%) */}
      <div
        style={{
          flex: 3,
          backgroundColor: "#fafafa",
          padding: 14,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* ✅ QR placeholder (공통) */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <TicketQR size={64} variant="dark" label="QR" radius={8} />
        </div>

        {/* 바코드 느낌 */}
        <div
          aria-hidden
          style={{
            marginTop: 14,
            height: 34,
            borderRadius: 4,
            background:
              "repeating-linear-gradient(90deg," +
              "#111 0px, #111 2px," +
              "transparent 2px, transparent 4px," +
              "#111 4px, #111 5px," +
              "transparent 5px, transparent 8px)",
            opacity: 0.25,
          }}
        />

        {/* 세로 텍스트 */}
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 10,
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontWeight: 800,
            letterSpacing: "2px",
            color: "#111",
            opacity: 0.65,
            textTransform: "uppercase",
            fontSize: 12,
          }}
        >
          ADMIT ONE
        </div>
      </div>
    </div>
  );
}
