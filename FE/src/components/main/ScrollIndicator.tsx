// src/components/common/ScrollIndicator.tsx
import React from "react";

const ScrollIndicator: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        right: 36,
        bottom: 34,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "var(--muted)",
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      Scroll <span style={{ transform: "translateY(1px)" }}>↓</span>
    </div>
  );
};

export default ScrollIndicator;
