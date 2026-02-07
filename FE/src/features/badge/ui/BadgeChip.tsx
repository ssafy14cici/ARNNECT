// FE/src/components/badge/BadgeChip.tsx
import React from "react";
import type { BadgeDef } from "../../../features/badge/types"; // ✅ 네 프로젝트 타입 경로에 맞게 유지/수정
import { badgeImageSrc } from "../../../features/badge/assets"; // ✅ 너가 만든 assets.ts 경로에 맞게

type Props = {
  badge: BadgeDef;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  // 기존에 "featured" 같은 prop이 있으면 그대로 추가해도 됨
};

export default function BadgeChip({ badge, selected, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={!!selected}
      title={badge.description}
      style={{
        width: "100%",
        borderRadius: 14,
        border: selected ? "1px solid rgba(200,169,126,0.55)" : "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 12,
        color: "#fff",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={badgeImageSrc(badge.id)}
          alt={badge.name}
          loading="lazy"
          style={{
            width: 36,
            height: 36,
            objectFit: "contain",
            flex: "0 0 auto",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{badge.name}</div>
          <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.25 }}>{badge.description}</div>
        </div>
      </div>

      {selected && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#C8A97E",
            color: "#000",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          ✓
        </div>
      )}
    </button>
  );
}
