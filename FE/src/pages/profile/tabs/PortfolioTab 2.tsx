// FE/src/pages/profile/tabs/PortfolioTab.tsx
import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ArtistProfile, UserProfile } from "../types";

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
  createdAt?: string; // ISO
};

export default function PortfolioTab() {
  const { profile, isOwner } = useOutletContext<OutletCtx>();

  const isArtist = isArtistProfile(profile);

  // ✅ ArtistProfile에 portfolioItems(또는 portfolio) 필드가 아직 없을 수 있어서 안전하게 처리
  const items: PortfolioItem[] = useMemo(() => {
    if (!isArtist) return [];
    const anyProfile = profile as unknown as { portfolioItems?: PortfolioItem[]; portfolio?: PortfolioItem[] };
    return anyProfile.portfolioItems ?? anyProfile.portfolio ?? [];
  }, [isArtist, profile]);

  if (!isArtist) {
    return (
      <div style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>포트폴리오</h3>
        <div style={{ color: "#666" }}>포트폴리오 탭은 예술가 프로필에서만 제공됩니다.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>포트폴리오</h3>

        {isOwner && (
          <Link
            to="/lounge/portfolio"
            style={{
              fontSize: 12,
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: "6px 10px",
              background: "white",
              color: "inherit",
            }}
          >
            포트폴리오 관리로 이동
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            border: "1px dashed rgba(0,0,0,0.2)",
            borderRadius: 16,
            padding: 18,
            color: "rgba(0,0,0,0.55)",
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>포트폴리오가 없습니다</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {isOwner ? (
              <>
                라운지의 <strong>포트폴리오</strong>에서 작품/작업물을 추가하면 여기에 표시됩니다.
              </>
            ) : (
              <>아직 공개된 포트폴리오가 없습니다.</>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {items.map((it) => (
            <article
              key={it.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 16,
                overflow: "hidden",
                background: "white",
              }}
            >
              <div style={{ aspectRatio: "4 / 3", background: "rgba(0,0,0,0.04)" }}>
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{it.title}</div>
                {it.description ? (
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{it.description}</div>
                ) : (
                  <div style={{ fontSize: 13, color: "#999" }}>설명 없음</div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
