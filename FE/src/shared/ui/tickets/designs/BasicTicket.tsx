import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function BasicTicket({ data }: TicketDesignProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#fff",
        color: "#000",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 상단 이미지 영역 (55%) */}
      <div
        style={{
          height: "55%",
          backgroundColor: "#f0f0f0",
          position: "relative",
        }}
      >
        {data.posterUrl ? (
          <img
            src={data.posterUrl}
            alt="poster"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ccc",
              fontSize: "2rem",
              fontWeight: "100",
            }}
          >
            ART
          </div>
        )}
      </div>

      {/* 2. 하단 정보 영역 (45%) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "20px",
          boxSizing: "border-box",
          justifyContent: "space-between",
        }}
      >
        {/* 왼쪽: 상세 정보 */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "1px" }}>
            <p style={{ margin: 0 }}>{data.address}</p>
            {data.addressDetail ? <p style={{ margin: "4px 0 0" }}>{data.addressDetail}</p> : null}
          </div>

          <div style={{ margin: "20px 0" }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>DATE</p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>{data.startDate}</p>
            <p style={{ margin: 0, fontSize: "10px", color: "#888" }}>
              {data.startTime} - {data.endTime}
            </p>
          </div>

          {/* ✅ QR placeholder (공통) */}
          <TicketQR size={40} variant="dark" />
        </div>

        {/* 오른쪽: 세로 타이틀 */}
        <div
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            textAlign: "right",
            fontSize: "32px",
            fontWeight: "900",
            letterSpacing: "2px",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {data.title || "EXHIBITION"}
        </div>
      </div>
    </div>
  );
}
