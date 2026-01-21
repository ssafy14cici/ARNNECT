// src/components/common/ScrollIndicator.tsx
import React, { useState, useEffect } from "react";

const ScrollIndicator: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // 스크롤이 진행되면 숨기기
      if (window.scrollY > 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 36,
        bottom: 34,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "var(--muted)",
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        animation: "bounce 2s infinite",
        zIndex: 100,
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      Scroll <span style={{ transform: "translateY(1px)" }}>↓</span>
    </div>
  );
};

export default ScrollIndicator;
