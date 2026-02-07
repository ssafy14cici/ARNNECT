// tickets/designs/EarthDayTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

export default function EarthDayTicket({ data }: TicketDesignProps) {
  // 연도 고정 제거 및 제목 대문자화
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
        }}
      >
        {/* 기존 바코드 자리에 QR 코드 배치 */}
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

      {/* 2. 메인 컨텐츠 영역 */}
      <div
        style={{
          flex: 1,
          padding: "45px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* 상단 타이틀 섹션 */}
        <div>
          <h1
            style={{
              fontSize: "60px",
              lineHeight: 0.9,
              margin: 0,
              fontWeight: 900,
              letterSpacing: "-2px",
              fontFamily: "Arial Black, sans-serif",
              whiteSpace: "pre-line", // 줄바꿈 적용
            }}
          >
            {title}
          </h1>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginTop: "20px",
              color: "#A855F7", // 강조 포인트 컬러
            }}
          >
            {data.startDate ? data.startDate.toUpperCase() : "DATE NOT SET"}
          </div>
        </div>

        {/* 하단 위치 정보 (이메일/2024 등 삭제) */}
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>
          <div
            style={{
              textTransform: "uppercase",
              borderBottom: "2px solid #000",
              display: "inline-block",
              paddingBottom: "4px",
              marginBottom: "8px",
            }}
          >
            Location
          </div>
          <div style={{ opacity: 0.8, fontSize: "18px" }}>
            {data.address || "LOCATION PENDING"}
          </div>
          {data.addressDetail && (
            <div style={{ opacity: 0.6, fontSize: "14px", marginTop: "4px" }}>
              {data.addressDetail}
            </div>
          )}
        </div>

        {/* 일러스트 공간을 비워두어 깔끔하게 유지하거나, 포스터가 있을 때만 출력 */}
        {data.posterUrl && (
          <div
            style={{
              position: "absolute",
              right: "20px",
              bottom: "20px",
              width: "200px",
              height: "200px",
              opacity: 0.2, // 배경처럼 은은하게
              zIndex: 0,
            }}
          >
            <img
              src={data.posterUrl}
              alt="bg-poster"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}