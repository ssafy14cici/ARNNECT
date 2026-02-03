// FE/src/pages/home/Home.tsx
import { useState, useEffect } from "react";
import HomePC from "./HomePC";
import HomeMobile from "./HomeMobile";

export default function Home() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // 리사이즈 핸들러
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 로딩 상태 없이 바로 분기 처리
  return (
    <div style={{ width: "100%", height: "100%" }}>
      {isMobile ? <HomeMobile /> : <HomePC />}
    </div>
  );
}