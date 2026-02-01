// FE/src/pages/fanLetter/FanLetterCompose.tsx

import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import { artworks } from "../../features/artwork/data";
import { findArtworkById, type ArtworkBase } from "../../features/artwork/helpers";
import { sendFanLetter } from "../../features/fanLetter/api";

import "./fanLetterCompose.css";

type LocationState = {
  artworkTitle?: string;
  artistName?: string;
  artistId?: string;
};

export default function FanLetterCompose() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state ?? {}) as LocationState;

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role); // "general" | "artist" | null

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];
  const baseArtwork = useMemo(() => findArtworkById(ARTWORKS, id), [ARTWORKS, id]);

  const artworkTitle =
    state.artworkTitle ||
    (baseArtwork && (baseArtwork.title as string | undefined)) ||
    "";

  const artistName =
    state.artistName ||
    (baseArtwork && ((baseArtwork.artist as string | undefined) || (baseArtwork.artistName as string | undefined))) ||
    "";

  const artistId =
    state.artistId ||
    (baseArtwork && (((baseArtwork as any).artistId as string | undefined) || ((baseArtwork as any).authorId as string | undefined))) ||
    "";

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = Boolean(user?.memberUuid) && role === "general" && content.trim().length > 0;

  const onSend = async () => {
    if (!canSend) {
      alert("내용을 입력해주세요.");
      return;
    }
    setSending(true);
    try {
      await sendFanLetter({
        artworkId: String(baseArtwork?.id ?? id ?? ""),
        artworkTitle,
        artistId,
        artistName,
        senderId: user!.memberUuid,
        senderName: user!.name,
        content: content.trim(),
      });
      alert("팬레터가 발송되었습니다.");
      nav(-1);
    } catch (e) {
      console.error(e);
      alert("발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fl-page">
      <div className="fl-card">
        <header className="fl-header">
          <h1 className="fl-title">Fan Letter</h1>
          <button type="button" className="fl-close" onClick={() => nav(-1)}>
            ✕
          </button>
        </header>

        <div className="fl-body">
          <div className="fl-row">
            <label className="fl-label">Artwork</label>
            <input className="fl-input" value={artworkTitle} readOnly placeholder="(작품명 없음)" />
          </div>

          <div className="fl-row">
            <label className="fl-label">To (Artist)</label>
            <input className="fl-input" value={artistName} readOnly placeholder="(작가 정보 없음)" />
          </div>

          <div className="fl-row">
            <label className="fl-label">Message</label>
            <textarea
              className="fl-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="작가에게 전하고 싶은 말을 적어주세요."
            />
          </div>
        </div>

        <footer className="fl-footer">
          <button type="button" className="fl-send" onClick={onSend} disabled={!canSend || sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </footer>
      </div>
    </div>
  );
}
