// src/pages/lounge/tabs/PortfolioTab.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import type { ArtistProfile, FeedItem } from "../../../features/profile/types";
import { profileApi } from "../../../features/profile/api";
import "../../profile/tabs/profileTabs.css";

import { resolveMediaUrl, fetchImageAsObjectUrl } from "../../artworks/detail/utils";

type OutletCtx = {
  profile: ArtistProfile;
  isOwner: boolean;
};

function SmartImage({
  rawUrl,
  alt = "",
  className,
  style,
}: {
  rawUrl?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string>("");
  const [hidden, setHidden] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  const triedBlobRef = useRef(false);

  useEffect(() => {
    setHidden(false);
    triedBlobRef.current = false;

    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }

    const normalized = resolveMediaUrl(rawUrl);
    setSrc(normalized || "");
  }, [rawUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {}
        objectUrlRef.current = null;
      }
    };
  }, []);

  const onError = async () => {
    if (hidden) return;
    if (triedBlobRef.current) {
      setHidden(true);
      return;
    }

    triedBlobRef.current = true;

    const objUrl = await fetchImageAsObjectUrl(rawUrl ?? "");
    if (!objUrl) {
      setHidden(true);
      return;
    }

    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
    }
    objectUrlRef.current = objUrl;
    setSrc(objUrl);
  };

  if (!src || hidden) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => void onError()}
    />
  );
}

export default function PortfolioTab() {
  const ctx = useOutletContext<OutletCtx | undefined>();
  const params = useParams(); // ✅ 제네릭/키 고정하지 말고 통째로 받기

  const profile = ctx?.profile;
  const isOwner = ctx?.isOwner ?? false;

  // ✅ 라우트 키가 뭐든(artistId/id/profileId/userId 등) 최대한 잡아내기
  const paramArtistId =
    (params as any)?.artistId ??
    (params as any)?.id ??
    (params as any)?.profileId ??
    (params as any)?.userId ??
    "";

  const profileId = String(profile?.id ?? paramArtistId ?? "").trim();

  const profileNickname = (profile as any)?.nickname ?? "";

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // ✅ 여기서 막히면 “라우트에 id 자체가 없는 구조”임
    if (!profileId) {
      setItems([]);
      setLoading(false);
      setError("작가 정보가 없습니다. (라우트 파라미터 확인 필요)");
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const page = await profileApi.getArtistFeed(profileId);
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
  }, [profileId]);

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

  const artistId = profileId;
  const exhibitPath = artistId ? `/exhibit/${encodeURIComponent(artistId)}` : "/exhibit";

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Portfolio</h3>

        <div style={{ display: "flex", gap: 8 }}>
          <Link
            to={exhibitPath}
            className="tab-btn"
            state={{
              from: "profile",
              artistId,
              artist: profileNickname,
              artworkTitle: "PORTFOLIO",
              fromWaypointId: 0,
            }}
          >
            3D 전시장 보기
          </Link>

          {isOwner && (
            <Link to="/artworks/create" className="tab-btn">
              작품 등록
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
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <SmartImage
                      rawUrl={it.imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
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
  );
}
