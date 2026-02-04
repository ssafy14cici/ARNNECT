//FE\src\pages\fanLetter\FanLetterCompose.tsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import { sendFanLetter } from "../../features/fanLetter/api";
import { http } from "../../shared/api/http";

import "./fanLetterCompose.css";

type LocationState = {
  artworkTitle?: string;
  artistName?: string;

  // ✅ 정식 키만 사용
  artistMemberUuid?: string;
};

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function get(obj: JsonObject, key: string): unknown {
  return obj[key];
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function unwrapEnvelope(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const d = get(raw, "data");
  return d ?? raw;
}

function normalizeArtworkId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/^artwork-/, "").replace(/^review-/, "");
}

function toArtworkNumericId(raw: unknown): number | null {
  const s = normalizeArtworkId(raw);
  if (!s) return null;

  const n = Number.parseInt(s.replace(/^a/, ""), 10);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

export default function FanLetterCompose() {
  const params = useParams() as Record<string, string | undefined>;
  const rawParamId = params.id ?? params.artworkId ?? "";

  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state ?? {}) as LocationState;

  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role); // "general" | "artist" | null

  const artworkIdNum = useMemo(() => toArtworkNumericId(rawParamId), [rawParamId]);

  const [artworkTitle, setArtworkTitle] = useState(state.artworkTitle ?? "");
  const [artistName, setArtistName] = useState(state.artistName ?? "");
  const [artistMemberUuid, setArtistMemberUuid] = useState(state.artistMemberUuid ?? "");

  useEffect(() => {
    if (!artworkIdNum) return;

    // 이미 핵심 정보 있으면 호출 생략
    if (artworkTitle && artistMemberUuid) return;

    let cancelled = false;

    (async () => {
      try {
        // ✅ baseURL에 /api/v1 포함이면 '/artworks/:id'
        // (미포함이면 '/api/v1/artworks/:id' 로 변경)
        const res = await http.get(`/artworks/${artworkIdNum}`);

        const payload =
          isObject(res) && "data" in res ? (res as { data: unknown }).data : (res as unknown);

        const data = unwrapEnvelope(payload);
        if (cancelled) return;
        if (!isObject(data)) return;

        const nextTitle =
          asString(get(data, "title"), "") ||
          asString(get(data, "artworkTitle"), "");

        const nextArtistName =
          asString(get(data, "artistName"), "") ||
          asString(get(data, "artist"), "") ||
          asString(get(data, "nickname"), "");

        // ✅ artistId fallback 제거 (정식 키만)
        const nextArtistMemberUuid =
          asString(get(data, "artistMemberUuid"), "") ||
          asString(get(data, "memberUuid"), "");

        if (!artworkTitle && nextTitle) setArtworkTitle(nextTitle);
        if (!artistName && nextArtistName) setArtistName(nextArtistName);
        if (!artistMemberUuid && nextArtistMemberUuid) setArtistMemberUuid(nextArtistMemberUuid);
      } catch {
        // 무시(상태값만으로도 동작)
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkIdNum]);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const canSend =
    Boolean(user?.memberUuid) &&
    role === "general" &&
    Boolean(artistMemberUuid) &&
    artworkIdNum !== null &&
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
    if (artworkIdNum == null) {
      alert("작품 ID를 확인할 수 없습니다.");
      return;
    }

    const message = content.trim();
    if (!message) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      // ✅ 실API 최소 payload만 전송
      await sendFanLetter({
        artistMemberUuid,
        artworkId: artworkIdNum,
        content: message,
        artworkTitle,
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
            <input
              className="fl-input"
              value={artistName || artistMemberUuid}
              readOnly
              placeholder="(작가 정보 없음)"
            />
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
