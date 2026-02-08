// FE/src/pages/profile/tabs/FanLetterTab.tsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { ArtistProfile } from "../../../features/profile/types";
import type { FanLetter } from "../../../features/fanLetter/types";
import { fetchArtistFanLetters } from "../../../features/fanLetter/api/real";
import "./profileTabs.css";

type OutletCtx = {
  profile: ArtistProfile;
  isOwner: boolean;
};

export default function FanLetterTab() {
  const { profile } = useOutletContext<OutletCtx>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fanLetters, setFanLetters] = useState<FanLetter[]>([]);

  const reload = async () => {
    if (!profile?.id) {
      setError("프로필 정보를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const all = await fetchArtistFanLetters(profile.id);
      // ✅ 답변된 팬레터만 필터링 (공개용)
      const answered = all.filter((fl) => fl.isAnswered && fl.answer);
      setFanLetters(answered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "팬레터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="tab-container">
        <div className="tab-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-container">
        <div className="tab-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Fan Letters</h3>
        <div className="tab-controls">
          <button type="button" onClick={reload} className="tab-btn" disabled={loading}>
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>
      </div>

      <div className="tab-desc">
        답변된 팬레터만 공개됩니다.
      </div>

      {fanLetters.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">No Fan Letters Yet</div>
          <div>아직 답변된 팬레터가 없습니다.</div>
        </div>
      ) : (
        <div className="tab-list">
          {fanLetters.map((letter) => (
            <div key={letter.id} className="fan-letter-card">
              <div className="fan-letter-header">
                <span className="fan-letter-from">From: {letter.fromNickname}</span>
                <span className="fan-letter-date">{letter.createdAt?.slice(0, 10)}</span>
              </div>

              {letter.artworkName && (
                <div className="fan-letter-artwork">
                  📌 {letter.artworkName}
                </div>
              )}

              <div className="fan-letter-question">
                <div className="fan-letter-label">Question</div>
                <div className="fan-letter-content">{letter.question}</div>
              </div>

              {letter.answer && (
                <div className="fan-letter-answer">
                  <div className="fan-letter-label">Answer</div>
                  <div className="fan-letter-content">{letter.answer}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
