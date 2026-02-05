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

const HORIZONTAL_TYPES: TicketDesignType[] = ["MINIMAL", "HOLO", "SIMPLE", "PURPLE", "PINK", "RED"];

// ✅ 티켓 “원본” 기준 캔버스 크기 (디자인들이 픽셀 기반이라 넉넉히 잡는 게 안전)
const BASE_VERTICAL = { w: 300, h: 660 };   // 1 : 2.2
const BASE_HORIZONTAL = { w: 660, h: 300 }; // 2.2 : 1

export default function TicketPreview({ designType, data }: TicketPreviewProps) {
  const isHorizontal = HORIZONTAL_TYPES.includes(designType);

  const base = isHorizontal ? BASE_HORIZONTAL : BASE_VERTICAL;

  // ✅ 미리보기 프레임(우측 패널 안에서의 티켓 표시 영역)
  // - 세로/가로 모두 같은 “최대 폭” 정책 유지
  // - 높이는 aspect-ratio로 자동
  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      maxWidth: "280px",
      aspectRatio: isHorizontal ? "2.2 / 1" : "1 / 2.2",
      margin: "0 auto",
      position: "relative",
      overflow: "visible",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    [isHorizontal],
  );

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // ✅ ResizeObserver로 실제 프레임 크기에 맞게 scale 계산
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      const sx = rect.width / base.w;
      const sy = rect.height / base.h;

      // 살짝 여백(1~2%) 주면 border/padding 환경에서도 끼임 방지
      const next = Math.min(sx, sy) * 0.98;

      // 너무 커지면(원본보다 확대) 텍스트 계단/번짐 가능 → 1로 캡
      setScale(Math.min(1, next));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [base.w, base.h]);

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

  return (
    <div ref={frameRef} style={containerStyle}>
      {/* ✅ “원본 캔버스”를 만든 뒤 transform scale로 통째로 축소 */}
      <div
        style={{
          width: `${base.w}px`,
          height: `${base.h}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          willChange: "transform",
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
