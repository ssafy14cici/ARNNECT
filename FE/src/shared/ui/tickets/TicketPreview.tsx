import BasicTicket from "./designs/BasicTicket";
import ModernTicket from "./designs/ModernTicket";
import MinimalTicket from "./designs/MinimalTicket";

// TicketDesignType export
export type TicketDesignType = "BASIC" | "MODERN" | "MINIMAL";

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
  // 디자인에 따라 컨테이너 비율 변경
  // Basic, Modern: 세로형 (비율 1:2.2 정도)
  // Minimal: 가로형 (비율 2.5:1 정도)
  
  const isHorizontal = designType === "MINIMAL";

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isHorizontal ? "320px" : "240px", 
    // 가로형이면 높이를 낮게, 세로형이면 높게 설정
    aspectRatio: isHorizontal ? "2.2 / 1" : "1 / 2.2", 
    margin: "0 auto",
    transition: "all 0.3s ease",
  };

  const renderContent = () => {
    switch (designType) {
      case "MODERN":
        return <ModernTicket data={data} />;
      case "MINIMAL":
        return <MinimalTicket data={data} />;
      case "BASIC":
      default:
        return <BasicTicket data={data} />;
    }
  };

  return <div style={containerStyle}>{renderContent()}</div>;
}