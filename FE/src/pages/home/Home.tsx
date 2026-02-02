// FE/src/pages/home/Home.tsx
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion"; // 애니메이션용
import HomePC from "./HomePC";
import HomeMobile from "./HomeMobile";
import LoadingScreen from "./LoadingScreen"; // 아까 만든 로딩 컴포넌트 import

export default function Home() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    // 1. 리사이즈 핸들러
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    // 2. 로딩 타이머 (2.5초 후 로딩 끝)
    // 실제 데이터 페칭이 있다면 그 로직이 끝나는 시점에 setIsLoading(false) 하면 됨
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(loadingTimer);
    };
  }, []);

  return (
    // AnimatePresence: 컴포넌트가 언마운트(사라질 때) 애니메이션을 적용해줌
    <AnimatePresence mode="wait">
      {isLoading ? (
        // 로딩 중일 때
        <LoadingScreen key="loading-screen" />
      ) : (
        // 로딩 끝났을 때 (모바일/PC 분기)
        // motion.div로 감싸서 등장할 때 자연스럽게 나타나게 처리 (선택사항)
        <motion.div
          key="home-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ width: "100%", height: "100%" }}
        >
          {isMobile ? <HomeMobile /> : <HomePC />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}