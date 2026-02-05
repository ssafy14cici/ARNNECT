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

  /**
   * ✅ 중요
   * - TicketPreview는 "프레임" 역할만 하고, 디자인(배경/그림자/모서리/클리핑)은 각 티켓 컴포넌트가 담당.
   * - 가로형은 maxWidth 고정값 금지 (부모 폭에 맞춰야 잘림/축소 문제 없음)
   */
  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isHorizontal ? "100%" : "280px",
    aspectRatio: isHorizontal ? "2.5 / 1" : "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.25s ease",
    position: "relative",
    overflow: "visible", // ✅ hidden 금지 (가로 티켓 잘림 원인)
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

  return <div style={containerStyle}>{renderContent()}</div>;
}
