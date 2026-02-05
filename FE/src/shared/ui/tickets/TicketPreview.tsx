// tickets/TicketPreview.tsx
import React from "react";

import BasicTicket from "./designs/BasicTicket";
import ModernTicket from "./designs/ModernTicket";
import MinimalTicket from "./designs/MinimalTicket";
import HoloAbstractTicket from "./designs/HoloAbstractTicket";
import SimpleTicket from "./designs/SimpleTicket";
import PurpleTicket from "./designs/PurpleTicket";
import PinkTicket from "./designs/PinkTicket";
import Redticket from "./designs/RedTicket";


// ✅ TicketDesignType export
export type TicketDesignType = "BASIC" | "MODERN" | "MINIMAL" | "HOLO_ABSTRACT" | "SIMPLE" | "PURPLE" | "PINK" | "RED";

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
  // ✅ 가로형 디자인
  const isHorizontal = designType === "MINIMAL" || designType === "HOLO_ABSTRACT";

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isHorizontal ? "420px" : "240px",
    aspectRatio: isHorizontal ? "2.6 / 1" : "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.3s ease",
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
        return <Redticket data={data} />;
      case "BASIC":
      default:
        return <BasicTicket data={data} />;
    }
  };

  return <div style={containerStyle}>{renderContent()}</div>;
}
