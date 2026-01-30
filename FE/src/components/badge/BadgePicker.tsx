import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // ✅ Portal 임포트
import { BADGES } from "../../features/badge/data";
import { useBadgeStore } from "../../features/badge/store";
import type { BadgeDef } from "../../features/badge/types";
import "./badgePickerModal.css";

export default function BadgePicker({
  open,
  onClose,
  earnedIds,
}: {
  open: boolean;
  onClose: () => void;
  earnedIds: string[];
}) {
  const { featured, setFeatured } = useBadgeStore();
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setLocalSelected([...featured]);
      // ✅ 모달 열릴 때 스크롤 막기
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleToggle = (id: string) => {
    if (localSelected.includes(id)) {
      setLocalSelected(localSelected.filter((item) => item !== id));
    } else {
      if (localSelected.length < 3) {
        setLocalSelected([...localSelected, id]);
      }
    }
  };

  const handleClear = () => setLocalSelected([]);

  const handleSave = () => {
    setFeatured(localSelected); // 스토어 업데이트
    onClose(); // 모달 닫기
  };

  const earnedBadges: BadgeDef[] = BADGES.filter((b) => earnedIds.includes(b.id));

  // ✅ Portal을 사용하여 document.body 바로 아래에 렌더링 (스타일 충돌 방지)
  return createPortal(
    <div className="badge-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="badge-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="badge-modal-header">
          <h3 className="modal-title">
            대표 뱃지 선택 <span className="highlight">({localSelected.length}/3)</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Selected Chips */}
        <div className="badge-chips-area">
          {localSelected.length > 0 ? (
            localSelected.map((id) => {
              const badge = BADGES.find((b) => b.id === id);
              if (!badge) return null;
              return (
                <div key={id} className="badge-chip">
                  <span>{badge.name}</span>
                  <button 
                    type="button" 
                    className="chip-remove-btn" 
                    onClick={() => handleToggle(id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          ) : (
            <p className="empty-chips-text">선택된 뱃지가 없습니다.</p>
          )}
        </div>

        {/* Badge Grid */}
        <div className="badge-grid-area">
          {earnedBadges.length === 0 ? (
            <div className="badgeEmpty">
              <p>아직 획득한 뱃지가 없습니다.<br />활동을 통해 뱃지를 수집해보세요!</p>
            </div>
          ) : (
            earnedBadges.map((b) => {
              const isSelected = localSelected.includes(b.id);
              const isDisabled = !isSelected && localSelected.length >= 3;

              return (
                <div
                  key={b.id}
                  className={`badge-card ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                  onClick={() => !isDisabled && handleToggle(b.id)}
                >
                  <div className="badge-card-content">
                    <div className="badge-name">{b.name}</div>
                    {b.description && <div className="badge-desc">{b.description}</div>}
                  </div>
                  {isSelected && <div className="badge-check-icon">✔</div>}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="badge-modal-footer">
          {/* ✅ type="button" 필수! (Form 안에 있어도 submit 되지 않도록) */}
          <button type="button" className="btn-cancel" onClick={handleClear}>초기화</button>
          <div style={{ flex: 1 }}></div>
          <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
          <button type="button" className="btn-save" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>,
    document.body // ✅ Portal Target
  );
}