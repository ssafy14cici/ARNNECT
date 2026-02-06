// FE/src/shared/ui/tickets/TicketPreview.tsx
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

import BasicTicket from "./designs/BasicTicket";
import ModernTicket from "./designs/ModernTicket";
import MinimalTicket from "./designs/MinimalTicket";
import HoloTicket from "./designs/HoloTicket";
import SimpleTicket from "./designs/SimpleTicket";
import PurpleTicket from "./designs/PurpleTicket";
import PinkTicket from "./designs/PinkTicket";
import RedTicket from "./designs/RedTicket";

export type TicketDesignType =
  | "BASIC"
  | "MODERN"
  | "MINIMAL"
  | "HOLO"
  | "SIMPLE"
  | "PURPLE"
  | "PINK"
  | "RED";

interface TicketPreviewProps {
  designType: TicketDesignType;
  data: {
    title: string;
    address: string;
    addressDetail?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    posterUrl: string;
  };
}

// ✅ “가로 디자인” 목록
const HORIZONTAL_TYPES: TicketDesignType[] = ["MINIMAL", "HOLO", "SIMPLE", "PURPLE", "PINK", "RED"];

// ✅ 디자인들이 픽셀/비율 기반이라 “원본 캔버스”를 고정해두고 scale로 줄이는 게 안정적
// 세로 티켓(예: Basic)은 300x660 정도면 무난
const BASE_VERTICAL = { w: 300, h: 660 };
// 가로 티켓은 660x300 정도(2.2:1)
const BASE_HORIZONTAL = { w: 660, h: 300 };

// ✅ 프리뷰(우측)에서 “보여주는 틀”은 항상 세로 비율로 고정 (네가 원한 UX)
const PREVIEW_ASPECT = 1 / 2.2; // width : height
// 예: width가 280이면 height는 280 / (1/2.2) = 616 근처

export default function TicketPreview({ designType, data }: TicketPreviewProps) {
  const isHorizontal = HORIZONTAL_TYPES.includes(designType);
  const base = isHorizontal ? BASE_HORIZONTAL : BASE_VERTICAL;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // ✅ 프리뷰 틀 실제 크기에 맞춰 scale 계산
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      // 가로 티켓은 rotate(-90deg) 해서 들어가므로 “회전 후 크기”로 fit 계산해야 함
      // rotate(-90)하면 (w,h) -> (h,w)
      const rotatedW = isHorizontal ? base.h : base.w;
      const rotatedH = isHorizontal ? base.w : base.h;

      const sx = rect.width / rotatedW;
      const sy = rect.height / rotatedH;

      // 살짝 여유(2%) 줘서 border/padding 환경에서도 끼임/잘림 방지
      const next = Math.min(sx, sy) * 0.98;

      // 프리뷰는 확대보다 축소가 안전 (텍스트 번짐 방지)
      setScale(Math.min(1, next));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [isHorizontal, base.w, base.h]);

  const renderContent = () => {
    switch (designType) {
      case "MODERN":
        return <ModernTicket data={data} />;
      case "MINIMAL":
        return <MinimalTicket data={data} />;
      case "HOLO":
        return <HoloTicket data={data} />;
      case "SIMPLE":
        return <SimpleTicket data={data} />;
      case "PURPLE":
        return <PurpleTicket data={data} />;
      case "PINK":
        return <PinkTicket data={data} />;
      case "RED":
        return <RedTicket data={data} />;
      case "BASIC":
      default:
        return <BasicTicket data={data} />;
    }
  };

  // ✅ 프리뷰 틀: “항상 세로 티켓처럼” 보이도록 고정
  // - width는 부모(우측 박스) 안에서 최대한
  // - height는 aspect-ratio로 자동
  const frameStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      maxWidth: 280,
      aspectRatio: `${1} / ${2.2}`, // ✅ 세로 틀 고정
      position: "relative",
      overflow: "hidden",
      borderRadius: 18,
      background: "transparent",
    }),
    [],
  );

  return (
    <div ref={frameRef} style={frameStyle}>
      {/* ✅ 가운데 정렬된 “stage” */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: isHorizontal
            ? `translate(-50%, -50%) rotate(-90deg) scale(${scale})`
            : `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          willChange: "transform",
        }}
      >
        {/* ✅ 원본 캔버스 */}
        <div style={{ width: base.w, height: base.h }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
