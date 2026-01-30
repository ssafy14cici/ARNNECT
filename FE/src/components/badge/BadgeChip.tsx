import type { BadgeDef } from "../../features/badge/types";
import "./badge.css";

export default function BadgeChip({
  badge,
  selected,
  onClick,
  disabled,
}: {
  badge: BadgeDef;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`badgeChip ${selected ? "isSelected" : ""} ${disabled ? "isDisabled" : ""}`}
      onClick={!disabled ? onClick : undefined}
      aria-pressed={selected}
      disabled={disabled}
      title={badge.description}
    >
      <div className="badgeContent">
        <span className="badgeIcon">🎖️</span>{" "}
        {/* 아이콘이 있다면 badge.icon 사용 */}
        <div className="badgeInfo">
          <span className="badgeName">{badge.name}</span>
          <span className="badgeDesc">{badge.description}</span>
        </div>
      </div>

      {/* 선택 효과 (체크 표시) */}
      {selected && <div className="badgeCheck">✔</div>}
    </button>
  );
}
