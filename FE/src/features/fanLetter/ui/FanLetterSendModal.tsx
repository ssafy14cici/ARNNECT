import { useEffect, useMemo, useState } from "react";
import "./fanLetterSendModal.css";

type Props = {
  open: boolean;
  sending?: boolean;

  artworkTitle?: string; // ✅ optional
  artistName: string;

  onClose: () => void;
  onSend: (content: string) => void;
};

export default function FanLetterSendModal({
  open,
  sending = false,
  artworkTitle,
  artistName,
  onClose,
  onSend,
}: Props) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) setContent("");
  }, [open]);

  const showArtwork = Boolean(String(artworkTitle ?? "").trim());

  const disabled = useMemo(() => {
    if (!open) return true;
    if (sending) return true;
    if (!content.trim()) return true;
    return false;
  }, [open, sending, content]);

  if (!open) return null;

  const close = () => {
    if (sending) return;
    onClose();
  };

  const submit = () => {
    if (disabled) return;
    onSend(content.trim());
  };

  return (
    <div className="fl-backdrop" onMouseDown={close}>
      <div className="fl-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fl-header">
          <div className="fl-title">Fan Letter</div>
          <button type="button" className="fl-x" onClick={close} disabled={sending}>
            ✕
          </button>
        </header>

        <div className="fl-body">
          {showArtwork && (
            <div className="fl-row">
              <label className="fl-label">Artwork</label>
              <input className="fl-input" value={artworkTitle ?? ""} readOnly />
            </div>
          )}

          <div className="fl-row">
            <label className="fl-label">To</label>
            <input className="fl-input" value={artistName} readOnly />
          </div>

          <div className="fl-row">
            <label className="fl-label">Message</label>
            <textarea
              className="fl-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="작가에게 전할 메시지를 작성하세요."
            />
          </div>
        </div>

        <footer className="fl-footer">
          <button type="button" className="fl-btn ghost" onClick={close} disabled={sending}>
            Cancel
          </button>
          <button type="button" className="fl-btn primary" onClick={submit} disabled={disabled}>
            {sending ? "Sending..." : "Send"}
          </button>
        </footer>
      </div>
    </div>
  );
}
