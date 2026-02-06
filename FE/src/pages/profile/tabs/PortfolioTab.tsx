import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { ArtistProfile, FeedItem } from "../../../features/profile/types";
import { profileApi } from "../../../features/profile/api";
import "./profileTabs.css";

// ✅ 다른 페이지에서 쓰는 “이미지 정규화 + 인증 이미지(blob)” 유틸 재사용
import { resolveMediaUrl, fetchImageAsObjectUrl } from "../../artworks/detail/utils";

type OutletCtx = {
  profile: ArtistProfile;
  isOwner: boolean;
};

/**
 * ✅ <img> src에 그대로 넣어보고,
 * 실패하면(fetch) blob objectURL로 fallback
 */
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

  // objectURL revoke를 위해 추적
  const objectUrlRef = useRef<string | null>(null);
  const triedBlobRef = useRef(false);

  // rawUrl이 바뀌면 초기화
  useEffect(() => {
    setHidden(false);
    triedBlobRef.current = false;

    // 이전 objectURL 정리
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }

    const normalized = resolveMediaUrl(rawUrl);
    setSrc(normalized || "");
  }, [rawUrl]);

  // 언마운트 시 objectURL 정리
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
    // 1) 이미 숨김 처리했으면 끝
    if (hidden) return;

    // 2) blob fallback을 이미 시도했으면 더는 반복하지 말고 숨김
    if (triedBlobRef.current) {
      setHidden(true);
      return;
    }

    triedBlobRef.current = true;

    // ✅ 인증 필요 이미지면 blob으로 받아서 objectURL로 표시
    const objUrl = await fetchImageAsObjectUrl(rawUrl ?? "");
    if (!objUrl) {
      setHidden(true);
      return;
    }

    // 이전 objectURL 정리 후 새로 세팅
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
    }
    objectUrlRef.current = objUrl;
    setSrc(objUrl);
  };

  if (!src || hidden) {
    // 여기서 placeholder를 넣고 싶으면 div로 대체 가능
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        // React onError는 sync라서 async를 감싸줌
        void onError();
      }}
    />
  );
}

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
        <div className="tab-empty">?? ?...</div>
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

  // ✅ Exhibit 라우트가 /exhibit/:artistId 라면 반드시 id를 붙여서 이동해야 함
  const artistId = String(profile.id ?? "").trim();
  const exhibitPath = artistId ? `/exhibit/${encodeURIComponent(artistId)}` : "/exhibit";

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">?????</h3>

        {/* ✅ 버튼 영역 */}
        <div style={{ display: "flex", gap: 8 }}>
          {/* ✅ 관람자(일반 유저)도 3D 전시장 진입 가능하게 */}
          <Link
            to={exhibitPath}
            className="tab-btn"
            state={{
              from: "profile",
              artistId,
              artist: (profile as any)?.nickname ?? "",
              artworkTitle: "PORTFOLIO",
              fromWaypointId: 0,
            }}
          >
            3D 전시장 보기
          </Link>

          {/* ✅ 작가 본인만 작품 추가 가능 */}
          {isOwner && (
            <Link to="/artworks/create" className="tab-btn">
              ?? ??
            </Link>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">No ????? Items</div>
          <div>{isOwner ? <>작품을 등록해보세요.</> : <>아직 등록된 작품이 없습니다.</>}</div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {items.map((it) => {
            // ✅ 여기서 it.id를 artworkId로 취급
            const artworkId = it.id;

            return (
              <article key={it.id} className="tab-card">
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

                    <div className="tab-card-info">???: {it.createdAt ?? "-"}</div>
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
