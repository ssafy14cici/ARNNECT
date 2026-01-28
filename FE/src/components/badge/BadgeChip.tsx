import type { BadgeDef } from "../../types/badge";
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
      className={`badgeChip ${selected ? "isSelected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      title={badge.description}
    >
      <span className="badgeName">{badge.name}</span>
      <span className="badgeDesc">{badge.description}</span>
    </button>
  );
}
