// FE/src/pages/fanLetter/FanLetterCompose.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";

import { artworks } from "../../features/artworks/data";
import { findArtworkById, toArtworkNumericId, type ArtworkBase } from "../../features/artworks/helpers";

import { sendFanLetter } from "../../features/fanLetter/api";

import "./fanLetterCompose.css";

type LocationState = {
  artworkTitle?: string;
  artistName?: string;

  // ✅ 정식 키
  artistMemberUuid?: string;

  // 레거시 fallback
  artistId?: string;
};

export default function FanLetterCompose() {
  // ✅ 라우트 param 명이 id/artworkId 어느 쪽이든 커버
  const params = useParams() as Record<string, string | undefined>;
  const rawParamId = params.id ?? params.artworkId ?? "";

  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state ?? {}) as LocationState;

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role); // "general" | "artist" | null

  const ARTWORKS = artworks as unknown as readonly ArtworkBase[];
  const baseArtwork = useMemo(() => findArtworkById(ARTWORKS, rawParamId), [ARTWORKS, rawParamId]);

  const artworkTitle =
    state.artworkTitle ||
    (baseArtwork && (baseArtwork.title as string | undefined)) ||
    "";

  const artistName =
    state.artistName ||
    (baseArtwork && ((baseArtwork.artist as string | undefined) || (baseArtwork.artistName as string | undefined))) ||
    "";

  // ✅ FanLetterSendInput 필수: artistMemberUuid
  const artistMemberUuid =
    state.artistMemberUuid ||
    (baseArtwork && ((baseArtwork.artistMemberUuid as string | undefined) || (baseArtwork.artistId as string | undefined))) ||
    state.artistId ||
    "";

  // ✅ FanLetterSendInput.artworkId는 number
  const artworkIdNum = useMemo(() => {
    return toArtworkNumericId(baseArtwork?.id ?? rawParamId);
  }, [baseArtwork?.id, rawParamId]);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const canSend =
    Boolean(user?.memberUuid) &&
    role === "general" &&
    Boolean(artistMemberUuid) &&
    Boolean(artworkIdNum) &&
    content.trim().length > 0;

  const onSend = async () => {
    if (!user?.memberUuid || role !== "general") {
      alert("일반 유저만 발송할 수 있습니다.");
      return;
    }
    if (!artistMemberUuid) {
      alert("작가 정보를 찾지 못했습니다.");
      return;
    }
    if (!artworkIdNum) {
      alert("작품 ID를 확인할 수 없습니다.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      await sendFanLetter({
        artistMemberUuid,           // ✅ 필수
        artworkId: artworkIdNum,    // ✅ number
        artworkTitle,              // 레거시 호환
        artistName,                // 옵션 메타
        senderId: user.memberUuid, // 옵션 메타
        senderName: user.name,     // 레거시 호환
        content: content.trim(),   // ✅ 필수
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
            <input className="fl-input" value={artistName || artistMemberUuid} readOnly placeholder="(작가 정보 없음)" />
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
