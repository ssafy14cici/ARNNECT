import "./logoutModal.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LogoutModal({ isOpen, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay">
      <div className="logout-modal-box">
        <h2 className="logout-modal-title">Log Out</h2>
        <p className="logout-modal-desc">
          정말 로그아웃 하시겠습니까?<br />
          언제든 다시 돌아오실 수 있습니다.
        </p>

        <div className="logout-modal-actions">
          <button className="logout-btn-cancel" onClick={onClose}>
            취소
          </button>
          <button className="logout-btn-confirm" onClick={onConfirm}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}