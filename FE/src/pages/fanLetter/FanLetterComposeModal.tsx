// FE/src/pages/fanLetter/FanLetterComposeModal.tsx
import { useMemo, useState } from "react";
import "./fanLetterComposeModal.css";

import { useAuthStore } from "../../features/auth/store";
import { sendFanLetter } from "../../features/fanLetter/api";
import type { FanLetterSendInput } from "../../features/fanLetter/types";

type Props = {
  open: boolean;
  onClose: () => void;

  artworkId: number | null;
  artworkTitle: string;
  artistMemberUuid?: string;
  artistName?: string;
};

export default function FanLetterComposeModal({
  open,
  onClose,
  artworkId,
  artworkTitle,
  artistMemberUuid,
  artistName,
}: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const disabled = useMemo(() => {
    if (!open) return true;
    if (!isLoggedIn) return true;
    if (!artworkId) return true;
    if (!artistMemberUuid) return true; // ✅ FanLetterSendInput 필수
    if (!content.trim()) return true;
    return false;
  }, [open, isLoggedIn, artworkId, artistMemberUuid, content]);

  if (!open) return null;

  const close = () => {
    if (sending) return;
    setContent("");
    onClose();
  };

  const onSend = async () => {
    if (!isLoggedIn) return alert("로그인 후 이용해주세요.");
    if (!artworkId) return alert("작품 정보를 찾지 못했습니다.");
    if (!artistMemberUuid) return alert("작가 정보를 찾지 못했습니다.");

    const senderId = user?.memberUuid ?? "";
    const senderName = user?.name ?? "익명";

    const payload: FanLetterSendInput = {
      artistMemberUuid,
      artworkId,
      artworkTitle,            // 레거시 호환(→ artworkName)
      artistName,              // mock 저장 메타(옵션)
      senderId,                // mock 저장 메타(옵션)
      senderName,              // 레거시 호환(→ fromNickname)
      content: content.trim(),
    };

    setSending(true);
    try {
      await sendFanLetter(payload);
      alert("팬레터를 발송했습니다.");
      close();
    } catch (e) {
      console.error(e);
      alert("발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flm-backdrop" onMouseDown={close}>
      <div className="flm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flm-header">
          <div className="flm-title">Fan Letter</div>
          <button className="flm-close" onClick={close} type="button">
            ✕
          </button>
        </header>

        <div className="flm-body">
          <div className="flm-row">
            <label className="flm-label">Artwork</label>
            <input className="flm-input" value={artworkTitle} readOnly />
          </div>

          <div className="flm-row">
            <label className="flm-label">To</label>
            <input
              className="flm-input"
              value={artistName ? artistName : `artist: ${artistMemberUuid}`}
              readOnly
            />
          </div>

          <div className="flm-row">
            <label className="flm-label">Message</label>
            <textarea
              className="flm-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="작가에게 전할 메시지를 작성하세요."
              rows={7}
            />
          </div>
        </div>

        <footer className="flm-footer">
          <button className="flm-btn ghost" onClick={close} type="button" disabled={sending}>
            Cancel
          </button>
          <button className="flm-btn primary" onClick={onSend} type="button" disabled={disabled || sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </footer>
      </div>
    </div>
  );
}
