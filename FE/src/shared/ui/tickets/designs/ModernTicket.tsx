import type { TicketDesignProps } from "../../../../features/tickets/types";

export default function ModernTicket({ data }: TicketDesignProps) {
  // 톱니 모양(Jagged Edge)을 위한 CSS Gradient
  const jaggedStyle: React.CSSProperties = {
    position: "absolute",
    left: 0, right: 0,
    height: "12px",
    backgroundSize: "20px 20px",
    backgroundImage: "radial-gradient(circle at 10px 0, transparent 6px, #000 7px)",
    zIndex: 2,
  };

  return (
    <div style={{
      width: "100%", height: "100%", 
      backgroundColor: "#000", 
      color: "#fff",
      display: "flex", 
      fontFamily: "'Courier New', Courier, monospace", // 영수증 폰트 느낌
      position: "relative",
      padding: "20px 0", // 톱니 영역 확보
      boxSizing: "border-box"
    }}>
      {/* 상단 톱니 */}
      <div style={{ ...jaggedStyle, top: -6, transform: "rotate(180deg)" }} />
      
      {/* 하단 톱니 */}
      <div style={{ ...jaggedStyle, bottom: -6 }} />

      {/* 왼쪽: 거대 타이틀 (NEO ZONE 스타일) */}
      <div style={{ 
        flex: "0 0 40%", 
        borderRight: "1px solid rgba(255,255,255,0.3)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        overflow: "hidden"
      }}>
        <h1 style={{ 
          writingMode: "vertical-rl", 
          textOrientation: "upright", // 세로로 똑바로 서있는 글자
          fontSize: "36px", 
          fontWeight: "900", 
          margin: 0,
          letterSpacing: "-4px",
          textTransform: "uppercase",
          lineHeight: 0.8
        }}>
          {data.title ? data.title.substring(0, 8) : "TICKET"}
        </h1>
      </div>

      {/* 오른쪽: 상세 정보 그리드 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 16px" }}>
        {/* 상단: 타이틀 반복 & 작은 정보 */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "10px", opacity: 0.7, margin: "0 0 4px" }}>ORIGINAL TICKET</p>
          <h2 style={{ fontSize: "18px", margin: "0 0 12px", borderBottom: "1px solid #fff", paddingBottom: "8px" }}>
            {data.title || "TITLE"}
          </h2>
          
          <div style={{ fontSize: "10px", lineHeight: "1.6" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.6 }}>PLACE</span>
              <span>{data.address}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.6 }}>HOST</span>
              <span>ANNECT</span>
            </div>
          </div>
        </div>

        {/* 중단: 날짜/시간 그리드 박스 */}
        <div style={{ 
          border: "1px solid #fff", 
          marginTop: "auto", 
          fontSize: "10px",
          textAlign: "center"
        }}>
          <div style={{ borderBottom: "1px solid #fff", padding: "4px" }}>
            DATE
          </div>
          <div style={{ padding: "6px", fontWeight: "bold", fontSize: "12px" }}>
            {data.startDate}
          </div>
          <div style={{ display: "flex", borderTop: "1px solid #fff" }}>
            <div style={{ flex: 1, borderRight: "1px solid #fff", padding: "4px" }}>
              TIME<br/>
              <span style={{ fontWeight: "bold" }}>{data.startTime}</span>
            </div>
            <div style={{ flex: 1, padding: "4px" }}>
              ADMIT<br/>
              <span style={{ fontWeight: "bold" }}>1</span>
            </div>
          </div>
        </div>
        
        <p style={{ fontSize: "8px", textAlign: "right", marginTop: "8px", opacity: 0.5 }}>
          NO. 0000001
        </p>
      </div>
    </div>
  );
}