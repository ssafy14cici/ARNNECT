import { BADGES } from "../../data/badges";
import { useBadgeStore } from "../../stores/badgeStore";
import type { BadgeDef } from "../../types/badge";
import BadgeChip from "./BadgeChip";
import "./badge.css";

export default function BadgePicker({
  open,
  onClose,
  earnedIds,
}: {
  open: boolean;
  onClose: () => void;
  earnedIds: string[];
}) {
  const { featured, toggleFeatured, clearFeatured } = useBadgeStore();

  if (!open) return null;

  const earnedBadges: BadgeDef[] = BADGES.filter((b) => earnedIds.includes(b.id));
  const selectedCount = featured.length;

  return (
    <div className="badgeModalOverlay" role="dialog" aria-modal="true">
      <div className="badgeModal">
        <div className="badgeModalHeader">
          <h3 className="badgeTitle">대표 뱃지 선택 (최대 3개)</h3>
          <button type="button" className="badgeClose" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <p className="badgeHint">획득한 뱃지 중에서 대표 뱃지를 선택할 수 있어요.</p>

        {earnedBadges.length === 0 ? (
          <div className="badgeEmpty">아직 획득한 뱃지가 없어요.</div>
        ) : (
          <div className="badgeGrid">
            {earnedBadges.map((b) => {
              const isSelected = featured.includes(b.id);
              const disabled = !isSelected && selectedCount >= 3;

              return (
                <BadgeChip
                  key={b.id}
                  badge={b}
                  selected={isSelected}
                  disabled={disabled}
                  onClick={() => toggleFeatured(b.id)}
                />
              );
            })}
          </div>
        )}

        <div className="badgeFooter">
          <div className="badgeSelectedCount">선택됨: {selectedCount}/3</div>
          <div className="badgeFooterBtns">
            <button type="button" className="badgeGhost" onClick={clearFeatured}>
              초기화
            </button>
            <button type="button" className="badgeOk" onClick={onClose}>
              완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
