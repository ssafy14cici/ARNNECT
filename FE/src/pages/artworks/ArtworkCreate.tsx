// FE/src/pages/artworks/ArtworkCreate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css";

import { useAuthStore } from "../../features/auth/store";
import { createArtwork } from "../../features/artworks/api";
import ArtworkForm from "../../features/artworks/ui/ArtworkForm";
import type { ArtworkCreateReq } from "../../features/artworks/model/types";

export default function ArtworkCreate() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const appRole = useAuthStore((s) => s.role); // "general" | "artist"

  const [loading, setLoading] = useState(false);

  const onSubmit = async (req: ArtworkCreateReq) => {
    if (!user?.memberUuid) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    setLoading(true);
    try {
      const author = {
        id: user.memberUuid,
        name: user.name,
        role: appRole === "artist" ? "ARTIST" : "USER",
      } as const;

      await createArtwork({
        ...req,
        author, // real에서는 무시되어도 괜찮고(mock/로컬 호환용)
      });

      alert("등록되었습니다.");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-create-page theme-artist">
      <div className="pc-container">
        <header className="pc-header">
          <h1 className="pc-title">New Artwork</h1>
          <button className="pc-close-btn" onClick={() => navigate(-1)} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <ArtworkForm submitting={loading} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
