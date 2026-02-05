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
  // ✅ 가로형 디자인 (SIMPLE, PURPLE, PINK, RED 포함)
  const isHorizontal =
    designType === "MINIMAL" ||
    designType === "HOLO_ABSTRACT" ||
    designType === "SIMPLE" ||
    designType === "PURPLE" ||
    designType === "PINK" ||
    designType === "RED";

  // 가로 티켓: 세로 컨테이너 안에서 -90° 회전하여 잘리지 않게 표시
  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "240px",
    aspectRatio: isHorizontal ? "1 / 1.6" : "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  };

  // 가로 티켓 회전 래퍼: 컨테이너(W × 1.6W) 안에서 가로 비율(1.6W × W) → -90° 회전
  const horizontalInnerStyle: React.CSSProperties = {
    position: "absolute",
    width: "160%",
    height: "62.5%",
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
