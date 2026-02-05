// FE/src/shared/ui/tickets/TicketPreview.tsx
import React from "react";

import BasicTicket from "./designs/BasicTicket";
import ModernTicket from "./designs/ModernTicket";
import MinimalTicket from "./designs/MinimalTicket";
import HoloTicket from "./designs/HoloTicket";
import SimpleTicket from "./designs/SimpleTicket";
import PurpleTicket from "./designs/PurpleTicket";
import PinkTicket from "./designs/PinkTicket";
import RedTicket from "./designs/RedTicket";

// ✅ TicketDesignType export
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

export default function TicketPreview({ designType, data }: TicketPreviewProps) {
  const isHorizontal = HORIZONTAL_TYPES.includes(designType);

  // 세로 컨테이너 (가로/세로 티켓 모두 동일한 세로 프레임 사용)
  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "280px",
    aspectRatio: "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.25s ease",
    position: "relative",
    overflow: "hidden",
  };

  /**
   * 가로 티켓 회전 래퍼
   * 컨테이너가 W × 2.2W (세로)일 때:
   * - 내부를 2.2W × W (가로)로 만들고 -90° 회전
   * - 회전 후 시각적 크기 = W × 2.2W → 컨테이너에 딱 맞음
   * - width: 220% = 컨테이너 높이, height: 45.45% = 컨테이너 너비
   */
  const horizontalInnerStyle: React.CSSProperties = {
    position: "absolute",
    width: "220%",
    height: "45.4545%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-90deg)",
  };

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
    <div style={containerStyle}>
      {isHorizontal ? (
        <div style={horizontalInnerStyle}>{renderContent()}</div>
      ) : (
        renderContent()
      )}
    </div>
  );
}
