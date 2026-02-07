// tickets/designs/EarthDayTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function EarthDayTicket({ data }: TicketDesignProps) {
  // 제목 대문자화 및 줄바꿈 처리
  const title = (data.title || "HAPPY EARTH\nDAY!").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#F5EFE6", // 부드러운 베이지 배경
        color: "#000",
        display: "flex",
        fontFamily: "'Inter', 'Arial Black', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. 좌측 블랙 스텁 (Stub) - QR 코드 배치 */}
      <div
        style={{
          width: "140px",
          backgroundColor: "#1A1A1A", // 진한 검정색 배경
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            backgroundColor: "#FFF",
            padding: "10px",
            borderRadius: "12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
          }}
        >
          <TicketQR size={90} variant="dark" />
        </div>

        {/* 절취용 보라색 점선 */}
        <div
          style={{
            position: "absolute",
            right: "-3px",
            top: 0,
            bottom: 0,
            width: "6px",
            backgroundImage: "linear-gradient(to bottom, #A855F7 50%, rgba(255,255,255,0) 0%)",
            backgroundPosition: "right",
            backgroundSize: "6px 15px",
            backgroundRepeat: "repeat-y",
            zIndex: 10,
          }}
        />
      </div>

      {/* 2. 메인 컨텐츠 영역 (상하 구조로 변경) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* ✅ 상단 이미지 영역 (Poster Area) */}
        <div
          style={{
            height: "45%", // 이미지 영역 비중
            width: "100%",
            backgroundColor: "rgba(0,0,0,0.05)",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {data.posterUrl ? (
            <img
              src={data.posterUrl}
              alt="poster"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3, fontSize: 12 }}>
              POSTER IMAGE AREA
            </div>
          )}
        </div>

        {/* ✅ 하단 정보 영역 */}
        <div
          style={{
            flex: 1,
            padding: "30px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* 타이틀 & 날짜 */}
          <div>
            <h1
              style={{
                fontSize: "42px",
                lineHeight: 1.0,
                margin: 0,
                fontWeight: 900,
                letterSpacing: "-1.5px",
                fontFamily: "Arial Black, sans-serif",
                whiteSpace: "pre-line",
              }}
            >
              {title}
            </h1>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginTop: "12px",
                color: "#A855F7",
              }}
            >
              {data.startDate ? data.startDate.toUpperCase() : "DATE NOT SET"}
            </div>
          </div>

          {/* 장소 정보 */}
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>
            <div
              style={{
                textTransform: "uppercase",
                borderBottom: "2px solid #000",
                display: "inline-block",
                paddingBottom: "2px",
                marginBottom: "6px",
                fontSize: "12px",
              }}
            >
              Location
            </div>
            <div style={{ opacity: 0.8, fontSize: "16px", wordBreak: "keep-all" }}>
              {data.address || "LOCATION PENDING"}
              {data.addressDetail && ` (${data.addressDetail})`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}