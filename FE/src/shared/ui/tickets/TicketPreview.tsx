// tickets/TicketPreview.tsx
import React from "react";

import BasicTicket from "./designs/BasicTicket";
import ModernTicket from "./designs/ModernTicket";
import MinimalTicket from "./designs/MinimalTicket";
import HoloAbstractTicket from "./designs/HoloTicket";
import SimpleTicket from "./designs/SimpleTicket";
import PurpleTicket from "./designs/PurpleTicket";
import PinkTicket from "./designs/PinkTicket";
import RedTicket from "./designs/RedTicket";

export type TicketDesignType =
  | "BASIC"
  | "MODERN"
  | "MINIMAL"
  | "HOLO_ABSTRACT"
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

export default function TicketPreview({ designType, data }: TicketPreviewProps) {
  const isHorizontal = ["MINIMAL", "HOLO_ABSTRACT", "SIMPLE", "PURPLE", "PINK", "RED"].includes(designType);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isHorizontal ? "100%" : "280px",   // ✅ 600px 금지
    aspectRatio: isHorizontal ? "2.5 / 1" : "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.25s ease",
    position: "relative",
    // ✅ 프레임 스타일 제거 (디자인 컴포넌트가 책임)
    background: "transparent",
    boxShadow: "none",
    borderRadius: 0,
    overflow: "visible",
  };

  const renderContent = () => {
    switch (designType) {
      case "MODERN":
        return <ModernTicket data={data} />;
      case "MINIMAL":
        return <MinimalTicket data={data} />;
      case "HOLO_ABSTRACT":
        return <HoloAbstractTicket data={data} />;
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
