// FE/src/pages/profile/components/ProfileQnaPanel.tsx
import { useEffect, useState } from "react";
import "../profile.css";

type Props = {
  open: boolean;
  busy: boolean;
  canAsk: boolean;

  onClose: () => void;
  onSubmit: (message: string) => Promise<boolean>;

  placeholder?: string;
};

export default function ProfileQnaPanel({
  open,
  busy,
  canAsk,
  onClose,
  onSubmit,
  placeholder = "예: 작품 제작 과정이 궁금해요.",
}: Props) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) setMessage("");
  }, [open]);

  if (!open || !canAsk) return null;

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const ok = await onSubmit(trimmed);
    if (ok) {
      setMessage("");
      onClose();
    }
  };

  return (
    <div className="profileQnaPanel">
      <div className="profileQnaHeader">
        <strong>QnA 남기기</strong>
        <button className="profileTextBtn" onClick={onClose} type="button">
          닫기
        </button>
      </div>

      <textarea
        className="profileTextarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder={placeholder}
      />

      <div className="profileQnaActions">
        <button className="profileBtn" onClick={onClose} type="button">
          취소
        </button>
        <button className="profileBtn" disabled={busy || !message.trim()} onClick={handleSend} type="button">
          보내기
        </button>
      </div>
    </div>
  );
}
