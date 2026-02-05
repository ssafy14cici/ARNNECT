// FE/src/pages/hall/index.tsx
import { useState, useEffect } from "react";
import HallPC from "./Hall";
import HomeMobile from "../home/HomeMobile";

export default function HallPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 모바일에서는 HomeMobile을 보여줌
  return isMobile ? <HomeMobile /> : <HallPC />;
}
