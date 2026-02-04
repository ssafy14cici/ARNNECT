import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ArtistProfile, FeedItem } from "../../../features/profile/types";
import { profileApi } from "../../../features/profile/api";
import "./profileTabs.css";

type OutletCtx = {
  profile: ArtistProfile;
  isOwner: boolean;
};

export default function PortfolioTab() {
  const { profile, isOwner } = useOutletContext<OutletCtx>();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // ✅ 이 탭은 "리스트"만 담당 (3D 전시는 별도 라우트에서)
        const page = await profileApi.getArtistFeed(profile.id);
        if (!cancelled) setItems(page.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "포트폴리오 로딩 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  if (loading) {
    return (
      <div className="tab-container">
        <div className="tab-empty">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-container">
        <div className="tab-empty">{error}</div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Portfolio</h3>

        {/* ✅ 버튼 영역 */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* ✅ 관람자(일반 유저)도 3D 전시장 진입 가능하게 */}
          {/* <Link
            to={`/exhibit/${profile.id}`}
            className="tab-btn"
            state={{ from: "profile", artistId: profile.id }}
          > */}
          <Link to="/exhibit" className="tab-btn">
            3D 전시장 보기
          </Link>

          {/* ✅ 작가 본인만 작품 추가 가능 */}
          {isOwner && (
            <Link to="/artworks/create" className="tab-btn">
              Add Artwork
            </Link>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">No Portfolio Items</div>
          <div>{isOwner ? <>작품을 등록해보세요.</> : <>아직 등록된 작품이 없습니다.</>}</div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {items.map((it) => {
            // ✅ 여기서 it.id를 artworkId로 취급 (프로젝트 구조상 "작품 #id"로 쓰고 있었음)
            const artworkId = it.id;

            return (
              <article key={it.id} className="tab-card">
                {/* ✅ 카드 클릭하면 작품 상세로 이동 */}
                <Link
                  to={`/artworks/${artworkId}`}
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

                    <div className="tab-card-info">Created: {it.createdAt ?? "-"}</div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
