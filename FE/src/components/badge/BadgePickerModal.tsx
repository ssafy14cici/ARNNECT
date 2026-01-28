// FE/src/components/badge/BadgePickerModal.tsx
import type { Badge } from "../../pages/profile/types";

type Props = {
  /** 획득한 뱃지 전체 목록 */
  badges: Badge[];
  /** 대표 뱃지로 선택된 id 목록 */
  value: string[];
  /** 선택 변경 */
  onChange: (nextIds: string[]) => void;
  /** 최대 선택 개수 (기본 3) */
  maxSelect?: number;
};

function uniq(ids: string[]) {
  return Array.from(new Set(ids));
}

export default function BadgePickerModal({ badges, value, onChange, maxSelect = 3 }: Props) {
  const selected = uniq(value).slice(0, maxSelect);

  const toggle = (id: string) => {
    const isOn = selected.includes(id);

    if (isOn) {
      onChange(selected.filter((x) => x !== id));
      return;
    }

    if (selected.length >= maxSelect) return; // ✅ 최대 선택 도달 시 추가 선택 막기
    onChange([...selected, id]);
  };

  const remove = (id: string) => {
    onChange(selected.filter((x) => x !== id));
  };

  const idToBadge = new Map(badges.map((b) => [b.id, b]));
  const selectedBadges = selected.map((id) => idToBadge.get(id)).filter(Boolean) as Badge[];

  return (
    <div className="badgePicker">
      <div className="badgePickerTop">
        <div className="badgePickerTitle">
          <strong>대표 뱃지</strong>
          <span className="badgePickerHint">최대 {maxSelect}개 선택</span>
        </div>
        <div className="badgePickerCount">
          {selected.length}/{maxSelect}
        </div>
      </div>

      {/* 선택된 대표 뱃지(칩) */}
      {selectedBadges.length > 0 ? (
        <div className="badgeChips">
          {selectedBadges.map((b) => (
            <button key={b.id} type="button" className="badgeChip" onClick={() => remove(b.id)}>
              <span className="badgeChipLabel">{b.label}</span>
              <span className="badgeChipX">×</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="badgeEmpty">선택된 대표 뱃지가 없습니다.</div>
      )}

      {/* 뱃지 선택 그리드 */}
      {badges.length === 0 ? (
        <div className="badgeEmpty">획득한 뱃지가 없습니다.</div>
      ) : (
        <div className="badgeGrid">
          {badges.map((b) => {
            const isSelected = selected.includes(b.id);
            const disabled = !isSelected && selected.length >= maxSelect;

            return (
              <button
                key={b.id}
                type="button"
                className={[
                  "badgeCard",
                  isSelected ? "badgeCardSelected" : "",
                  disabled ? "badgeCardDisabled" : "",
                ].join(" ")}
                onClick={() => toggle(b.id)}
                disabled={disabled}
              >
                <div className="badgeCardTitle">{b.label}</div>
                {b.description && <div className="badgeCardDesc">{b.description}</div>}
                <div className="badgeCardMeta">{isSelected ? "선택됨" : "선택"}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
