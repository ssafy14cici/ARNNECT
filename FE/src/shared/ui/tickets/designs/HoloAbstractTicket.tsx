// tickets/designs/HoloAbstractTicket.tsx
import React from "react";
import type { TicketDesignProps } from "../../../../features/tickets/types";
import TicketQR from "./_parts/TicketQR";

/**
 * HOLO_ABSTRACT (가로형 + 우측 스텁 + 홀로 그라디언트 + QR placeholder)
 * - QR은 공통 placeholder(TicketQR)만 사용 (실제 QR은 나중에 TicketQR 내부만 교체)
 */
export default function HoloAbstractTicket({ data }: TicketDesignProps) {
  const title = (data.title || "ABSTRACT").toUpperCase();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
        color: "#fff",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
        background:
          "linear-gradient(135deg, rgba(255,60,190,0.95), rgba(90,60,255,0.95) 35%, rgba(55,110,255,0.95) 70%, rgba(80,215,255,0.85))",
      }}
    >
      {/* 배경 하이라이트 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.95,
          mixBlendMode: "screen",
          filter: "saturate(1.25)",
          background:
            "radial-gradient(600px 240px at 15% 10%, rgba(255,255,255,0.42), rgba(255,255,255,0) 60%)," +
            "radial-gradient(480px 260px at 20% 80%, rgba(255,170,240,0.55), rgba(255,255,255,0) 60%)," +
            "radial-gradient(520px 260px at 85% 15%, rgba(160,255,190,0.55), rgba(255,255,255,0) 60%)," +
            "radial-gradient(520px 320px at 78% 80%, rgba(255,220,140,0.45), rgba(255,255,255,0) 60%)",
        }}
      />

      {/* 리본 느낌(도안 느낌) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "35%",
          top: "18%",
          width: "50%",
          height: "60%",
          transform: "rotate(-8deg)",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,180,120,0.0), rgba(255,230,160,0.75), rgba(120,240,255,0.65), rgba(255,120,220,0.75), rgba(255,180,120,0.0))",
          maskImage: "radial-gradient(70% 60% at 50% 50%, #000 65%, rgba(0,0,0,0) 66%)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      {/* 스피어 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "22%",
          top: "44%",
          width: "13%",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0) 45%)," +
            "radial-gradient(circle at 65% 70%, rgba(255,80,210,0.9), rgba(255,80,210,0) 55%)," +
            "linear-gradient(135deg, rgba(255,235,170,0.85), rgba(90,220,255,0.85), rgba(240,80,220,0.85))",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          opacity: 0.95,
          pointerEvents: "none",
        }}
      />

      {/* 메인 + 스텁 */}
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* 좌측 메인 */}
        <div style={{ flex: 1, padding: "18px 18px 14px 18px", boxSizing: "border-box", position: "relative" }}>
          {/* 큰 타이틀 */}
          <div
            style={{
              fontSize: "44px",
              fontWeight: 300,
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 6,
              textTransform: "uppercase",
              opacity: 0.97,
              textShadow: "0 2px 16px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={title}
          >
            {title}
          </div>

          {/* 우상단 서브타이틀 */}
          <div
            style={{
              position: "absolute",
              right: 18,
              top: 18,
              textAlign: "right",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "2px",
              opacity: 0.9,
              textTransform: "uppercase",
              lineHeight: 1.35,
            }}
          >
            <div>ABSTRACT ART</div>
            <div>EXHIBITION</div>
          </div>

          {/* 날짜/장소 */}
          <div style={{ marginTop: 74 }}>
            <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px", opacity: 0.95 }}>
              {data.startDate} - {data.endDate}
            </div>

            <div style={{ marginTop: 10, fontSize: "13px", lineHeight: 1.35, opacity: 0.92 }}>
              <div style={{ fontWeight: 700, opacity: 0.95 }}>Location:</div>
              <div style={{ opacity: 0.9 }}>
                {data.address}
                {data.addressDetail ? `, ${data.addressDetail}` : ""}
              </div>
            </div>
          </div>

          {/* 하단 라인 */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 44,
              height: 1,
              background: "rgba(255,255,255,0.45)",
            }}
          />

          {/* 바코드 느낌 */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 12,
              height: 22,
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: 0.95,
            }}
          >
            <div
              style={{
                height: "100%",
                width: 160,
                borderRadius: 2,
                background:
                  "repeating-linear-gradient(90deg," +
                  "rgba(255,255,255,0.0) 0px," +
                  "rgba(255,255,255,0.0) 2px," +
                  "rgba(255,255,255,0.95) 2px," +
                  "rgba(255,255,255,0.95) 4px," +
                  "rgba(255,255,255,0.2) 4px," +
                  "rgba(255,255,255,0.2) 7px)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
              }}
            />
          </div>
        </div>

        {/* 우측 스텁 */}
        <div
          style={{
            width: 132,
            position: "relative",
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(6px)",
            boxSizing: "border-box",
          }}
        >
          {/* 점선 절취선 */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: "2px dotted rgba(255,255,255,0.55)",
            }}
          />

          {/* QR placeholder */}
          <div style={{ margin: "14px auto 0", width: 82, height: 82, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TicketQR size={72} variant="light" label="QR" radius={8} />
          </div>

          {/* 스텁 세로 텍스트 */}
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              top: 112,
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontWeight: 700,
                letterSpacing: "2px",
                opacity: 0.92,
                textTransform: "uppercase",
                fontSize: 16,
              }}
            >
              ABSTRACT
            </div>

            <div aria-hidden style={{ width: 1, height: 90, background: "rgba(255,255,255,0.7)", opacity: 0.8 }} />

            <div
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontWeight: 600,
                letterSpacing: "2px",
                opacity: 0.88,
                textTransform: "uppercase",
                fontSize: 14,
              }}
            >
              ART
            </div>

            <div
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontWeight: 600,
                letterSpacing: "2px",
                opacity: 0.88,
                textTransform: "uppercase",
                fontSize: 14,
              }}
            >
              EXHIBITION
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
