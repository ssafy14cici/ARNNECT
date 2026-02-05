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
  // 가로형 디자인 여부 판단
  const isHorizontal = [
    "MINIMAL", "HOLO_ABSTRACT", "SIMPLE", "PURPLE", "PINK", "RED"
  ].includes(designType);

  // 컨테이너 스타일: 가로형은 시원하게 넓히고, 세로형은 기존 폭 유지
  const containerStyle: React.CSSProperties = {
    width: "100%",
    // 가로형은 최대 600px까지 확장, 세로형은 280px 정도로 고정
    maxWidth: isHorizontal ? "600px" : "280px", 
    // 실제 티켓 비율(약 2.5:1 / 세로는 1:2.2) 적용
    aspectRatio: isHorizontal ? "2.5 / 1" : "1 / 2.2",
    margin: "0 auto",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
    overflow: "hidden",
    backgroundColor: "#fff",
  };

  const renderContent = () => {
    switch (designType) {
      case "MODERN": return <ModernTicket data={data} />;
      case "MINIMAL": return <MinimalTicket data={data} />;
      case "HOLO_ABSTRACT": return <HoloAbstractTicket data={data} />;
      case "SIMPLE": return <SimpleTicket data={data} />;
      case "PURPLE": return <PurpleTicket data={data} />;
      case "PINK": return <PinkTicket data={data} />;
      case "RED": return <Redticket data={data} />;
      case "BASIC":
      default: return <BasicTicket data={data} />;
    }
  };

  return (
    <div style={containerStyle}>
      {renderContent()}
    </div>
  );
}