//FE/src/pages/profile/tabs/FeedTab.tsx

import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type {
  ArtistProfile,
  UserProfile,
} from "../../../features/profile/types";
import "./profileTabs.css"; // ✅ CSS Import

type ProfileModel = ArtistProfile | UserProfile;

type OutletCtx = {
  profile: ProfileModel;
  isOwner: boolean;
};

function isArtistProfile(p: ProfileModel): p is ArtistProfile {
  return p.role === "ARTIST";
}

type PortfolioItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
  description?: string | null;
  createdAt?: string;
};

export default function PortfolioTab() {
  const { profile, isOwner } = useOutletContext<OutletCtx>();
  const isArtist = isArtistProfile(profile);

  const items: PortfolioItem[] = useMemo(() => {
    if (!isArtist) return [];
    const anyProfile = profile as unknown as {
      portfolioItems?: PortfolioItem[];
      portfolio?: PortfolioItem[];
    };
    return anyProfile.portfolioItems ?? anyProfile.portfolio ?? [];
  }, [isArtist, profile]);

  if (!isArtist) {
    return (
      <div className="tab-container">
        <div className="tab-empty">Available for Artist Profiles only.</div>
      </div>
    );
  }

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Portfolio</h3>

        {isOwner && (
          <Link to="/lounge/portfolio" className="tab-btn">
            Manage Portfolio
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">No Portfolio Items</div>
          <div>
            {isOwner ? (
              <>라운지에서 작품 포트폴리오를 추가해보세요.</>
            ) : (
              <>아직 등록된 포트폴리오가 없습니다.</>
            )}
          </div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {items.map((it) => (
            <article key={it.id} className="tab-card">
              {/* 이미지 영역 */}
              {it.imageUrl && (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    overflow: "hidden",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="tab-card-body">
                <div className="tab-card-title" style={{ marginBottom: "8px" }}>
                  {it.title}
                </div>
                <div className="tab-card-info">
                  {it.description ? it.description : "No description"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
