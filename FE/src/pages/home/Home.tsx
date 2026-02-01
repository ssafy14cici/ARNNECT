// FE/src/pages/home/Home.tsx
import { useState, useEffect } from "react";
import HomePC from "./HomePC"; // 기존 내용을 HomePC로 옮겼다고 가정
import HomeMobile from "./HomeMobile";

export default function Home() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? <HomeMobile /> : <HomePC />;
}