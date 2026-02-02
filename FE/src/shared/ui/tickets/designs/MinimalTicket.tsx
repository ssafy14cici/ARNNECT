import type { TicketDesignProps } from "../../../../features/tickets/types";

export default function MinimalTicket({ data }: TicketDesignProps) {
  return (
    <div style={{
      width: "100%", height: "100%", 
      backgroundColor: "#fff", 
      color: "#222",
      display: "flex",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
    }}>
      {/* 왼쪽 메인 영역 (70%) */}
      <div style={{ flex: 7, padding: "20px", display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* 배경 장식 (포스터가 있을 경우 은은하게) */}
        {data.posterUrl && (
           <div style={{
             position: "absolute", right: "-30px", bottom: "-30px",
             width: "140px", height: "140px", borderRadius: "50%",
             backgroundImage: `url(${data.posterUrl})`, backgroundSize: "cover",
             opacity: 0.2, filter: "blur(5px)", zIndex: 0
           }} />
        )}

        <div style={{ zIndex: 1 }}>
          <h1 style={{ 
            fontSize: "26px", lineHeight: "1.1", margin: "0 0 10px 0", 
            fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif", // 장난스러운 폰트
            fontWeight: "900", wordBreak: "keep-all"
          }}>
            {data.title || "FESTIVAL"}
          </h1>
          
          <div style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "-1px" }}>
             {data.startDate.split("-").slice(1).join(".")}
             <span style={{ color: "#ff4d4d", marginLeft: "8px", fontSize: "14px", verticalAlign: "middle" }}>
               OPEN
             </span>
          </div>

          <div style={{ marginTop: "auto", fontSize: "11px", fontWeight: "600", color: "#555" }}>
            {data.address}<br/>
            {data.startTime} - {data.endTime}
          </div>
        </div>
      </div>

      {/* 절취선 (Dashed Border + Semicircles) */}
      <div style={{ 
        position: "relative", width: "0px", 
        borderRight: "2px dashed #ddd",
        margin: "10px 0"
      }}>
        <div style={{ 
          position: "absolute", top: "-20px", left: "-10px", 
          width: "20px", height: "20px", borderRadius: "50%", 
          backgroundColor: "#111" // 부모 배경색(Preview 배경)과 맞춰야 자연스러움. 여기선 #111 가정
        }} />
        <div style={{ 
          position: "absolute", bottom: "-20px", left: "-10px", 
          width: "20px", height: "20px", borderRadius: "50%", 
          backgroundColor: "#111" 
        }} />
      </div>

      {/* 오른쪽 스텁 영역 (30%) - 바코드 느낌 */}
      <div style={{ flex: 3, padding: "10px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <div style={{ 
          writingMode: "vertical-rl", 
          fontSize: "12px", 
          fontWeight: "bold", 
          letterSpacing: "1px",
          marginBottom: "10px"
        }}>
          ADMIT ONE
        </div>
        
        {/* 바코드 흉내 */}
        <div style={{ display: "flex", gap: "2px", height: "60px", alignItems: "center" }}>
          {[...Array(10)].map((_, i) => (
             <div key={i} style={{ width: Math.random() > 0.5 ? "3px" : "1px", height: "100%", backgroundColor: "#000" }} />
          ))}
        </div>
      </div>
    </div>
  );
}