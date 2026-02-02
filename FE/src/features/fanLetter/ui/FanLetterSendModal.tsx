// FE/src/features/fanLetter/ui/FanLetterSendModal.tsx
import { useEffect, useState } from "react";
import "./fanLetterSendModal.css";

type Props = {
  open: boolean;
  artworkTitle: string;
  artistName?: string;
  sending?: boolean;

  onClose: () => void;
  onSend: (content: string) => void;
};

export default function FanLetterSendModal({
  open,
  artworkTitle,
  artistName,
  sending = false,
  onClose,
  onSend,
}: Props) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) return;
    setContent("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const v = content.trim();
    if (!v) return;
    onSend(v);
  };

  return (
    <div className="fl-modal-overlay" onMouseDown={onClose}>
      <div className="fl-modal-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fl-modal-head">
          <h2 className="fl-modal-title">Fan Letter</h2>
          <button className="fl-modal-close" onClick={onClose} type="button" aria-label="close">
            ×
          </button>
        </div>

        <div className="fl-modal-meta">
          <div className="fl-meta-row">
            <span className="fl-meta-label">To</span>
            <span className="fl-meta-value">{artistName ?? "Artist"}</span>
          </div>
          <div className="fl-meta-row">
            <span className="fl-meta-label">Artwork</span>
            <span className="fl-meta-value">{artworkTitle}</span>
          </div>
        </div>

        <textarea
          className="fl-modal-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="작가에게 보낼 메시지를 작성하세요..."
          rows={8}
          disabled={sending}
        />

        <div className="fl-modal-actions">
          <button className="fl-btn ghost" onClick={onClose} type="button" disabled={sending}>
            Cancel
          </button>
          <button className="fl-btn primary" onClick={submit} type="button" disabled={sending || !content.trim()}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>

        <p className="fl-modal-hint">* 팬레터는 발송 후 수정/삭제 정책이 API에 맞춰질 예정입니다.</p>
      </div>
    </div>
  );
}
