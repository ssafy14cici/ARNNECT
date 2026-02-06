// FE/src/pages/lounge/artist/Portfolio.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../lounge.css";
import "../../profile/tabs/profileTabs.css";

import { useAuthStore } from "../../../features/auth/store";
import { profileApi } from "../../../features/profile/api";
import type { FeedItem } from "../../../features/profile/types";

export default function Portfolio() {
  const nav = useNavigate();

  const myUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const myNickname = useAuthStore((s) => s.user?.nickname ?? "");

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!myUuid) {
      setItems([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await profileApi.getArtistFeed(myUuid);
        if (!cancelled) setItems(page.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "포트폴리오를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [myUuid]);

  const goExhibit = () => {
    if (!myUuid) return;
    nav(`/exhibit/${myUuid}`, {
        state: {
          from: "lounge-portfolio",
          artist: myNickname,
          artworkTitle: "PORTFOLIO",
          fromWaypointId: 0,
        },
    });
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="tab-container">
          <div className="tab-header">
            <h3 className="tab-title">포트폴리오</h3>

            <div className="tab-controls">
              <button type="button" className="tab-btn" onClick={goExhibit}>
                3D 전시장 보기
              </button>
              <Link to="/artworks/create" className="tab-btn">
                작품 추가
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="tab-empty">로딩 중...</div>
          ) : error ? (
            <div className="tab-empty">{error}</div>
          ) : items.length === 0 ? (
            <div className="tab-empty">
              <div className="tab-empty-title">등록된 작품이 없습니다.</div>
              <div>첫 작품을 추가해보세요.</div>
            </div>
          ) : (
            <div className="tab-grid-2">
              {items.map((it) => (
                <article key={it.id} className="tab-card">
                  <Link
                    to={`/artworks/${it.id}`}
                    style={{ color: "inherit", textDecoration: "none", display: "block" }}
                  >
                    <div className="tab-card-body">
                      <div className="tab-card-title" style={{ marginBottom: 8 }}>
                        작품 #{it.id}
                      </div>

                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "4/3",
                          overflow: "hidden",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          marginBottom: 10,
                        }}
                      >
                        <img
                          src={it.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>

                      <div className="tab-card-info">등록일: {it.createdAt ?? "-"}</div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
