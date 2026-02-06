// FE/src/pages/fanLetter/MyFanLetters.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./NewFanLetter.css";

import { useAuthStore } from "../../features/auth/store";
import type { FanLetter as FanLetterModel } from "../../features/fanLetter/types";
import { fetchUserFanLetters } from "../../features/fanLetter/api";

function formatDate(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function MyFanLetters() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  const userMemberUuid = user?.memberUuid ?? "";

  const [items, setItems] = useState<FanLetterModel[]>([]);
  const [loading, setLoading] = useState(true);

  const canUse = role === "general" && Boolean(userMemberUuid);

  const refetch = useCallback(async () => {
    if (!userMemberUuid) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchUserFanLetters(userMemberUuid);
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
      alert("보낸 팬레터 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userMemberUuid]);

  useEffect(() => {
    if (!canUse) {
      return;
    }
    void refetch();
  }, [canUse, refetch]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [items]);

  if (!canUse) {
    return (
      <main style={{ padding: 24 }}>
        <h1>My Sent Fan Letters</h1>
        <div style={{ opacity: 0.8 }}>로그인이 필요합니다.</div>
      </main>
    );
  }

  return (
    <main className="fanletterPage">
      <header className="fanletterHeader">
        <h1 className="fanletterTitle">My Sent Fan Letters</h1>
      </header>

      {loading ? (
        <div style={{ padding: 24, opacity: 0.8 }}>Loading...</div>
      ) : sortedItems.length === 0 ? (
        <div style={{ padding: 24, opacity: 0.8 }}>보낸 팬레터가 없습니다.</div>
      ) : (
        <section className="fanletter-card-list">
          {sortedItems.map((fl) => (
            <div key={fl.id} className={`card fanletter-card ${fl.isAnswered ? "answered" : ""}`}>
                <div className="card__hero">
                    <div className="card__hero-header">
                        <span>To. {fl.artistName || "Artist"}</span>
                        <span>{formatDate(fl.createdAt)}</span>
                    </div>
                    {fl.artworkName && <div className="fanletter-artwork-name">🎨 {fl.artworkName}</div>}
                </div>
              
                <div className="card__body">
                    <p className="fanletter-question">{fl.question}</p>
                    {fl.isAnswered && fl.answer && (
                    <div className="fanletter-answer">
                        <div className="fanletter-answer-label">Answer</div>
                        <div className="fanletter-answer-text">{fl.answer}</div>
                    </div>
                    )}
                </div>
                {fl.isAnswered && 
                    <div className="card__footer">
                        <span className="fanletter-badge">Answered</span>
                    </div>
                }
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
