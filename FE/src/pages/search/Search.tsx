// FE/src/pages/search/Search.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { artworks as rawArtworks } from "../../data/artworks";
import "./search.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

gsap.registerPlugin(ScrollTrigger);

type Tab = "artist" | "artwork" | "tag" | "user";
type Sort = "latest" | "oldest" | "views";

type Artwork = {
  id: string;
  src: string;

  // 확장 필드(있으면 사용, 없으면 fallback)
  title?: string;
  artist?: string;
  thumbnail?: string;
  likes?: number;
  views?: number;
  createdAt?: string; // ISO
};

const artworks = rawArtworks as unknown as Artwork[];

// 프로젝트 라우트에 맞게 수정
const DETAIL_PATH = (id: string) => `/artworks/${id}`;
const TABS: Tab[] = ["artist", "artwork", "tag", "user"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

export default function Search() {
  const { isLoggedIn } = useAuthStore();

  const [tab, setTab] = useState<Tab>("artwork");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("latest");

  // parallax/lenis 적용 영역 ref
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isLocked = (t: Tab) => (t === "tag" || t === "user") && !isLoggedIn;

  const onChangeTab = (t: Tab) => {
    if (isLocked(t)) return;
    setTab(t);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // artwork 탭에서만 리스트 계산
  const filteredArtworks = useMemo<Artwork[]>(() => {
    if (tab !== "artwork") return [];

    const term = q.trim().toLowerCase();
    let list = [...artworks];

    if (term) {
      list = list.filter((x) => {
        const hay = `${x.title ?? ""} ${x.artist ?? ""} ${x.id}`.toLowerCase();
        return hay.includes(term);
      });
    }

    if (sort === "latest") {
      list.sort((a, b) => {
        const ta = a.createdAt ? +new Date(a.createdAt) : 0;
        const tb = b.createdAt ? +new Date(b.createdAt) : 0;
        return tb - ta;
      });
    } else if (sort === "oldest") {
      list.sort((a, b) => {
        const ta = a.createdAt ? +new Date(a.createdAt) : 0;
        const tb = b.createdAt ? +new Date(b.createdAt) : 0;
        return ta - tb;
      });
    } else {
      list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    }

    return list;
  }, [tab, q, sort]);

  // 3열 분배(유저 예제 방식 그대로)
  const col1 = useMemo(() => filteredArtworks.filter((_, i) => i % 3 === 0), [filteredArtworks]);
  const col2 = useMemo(() => filteredArtworks.filter((_, i) => i % 3 === 1), [filteredArtworks]);
  const col3 = useMemo(() => filteredArtworks.filter((_, i) => i % 3 === 2), [filteredArtworks]);

  useEffect(() => {
    // artwork 탭일 때만 parallax 동작
    if (tab !== "artwork") return;

    // 1) Lenis (smooth scroll)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    // Lenis scroll -> ScrollTrigger sync
    lenis.on("scroll", ScrollTrigger.update);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // 2) GSAP parallax + opening
    const ctx = gsap.context(() => {
      // 가운데 열: 느리게(아래로 살짝 밀림)
      gsap.to(".search-col-2", {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: ".search-gallery-grid",
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      // 양쪽 열: 조금 더 빠르게(위로 당겨짐)
      gsap.to(".search-col-1, .search-col-3", {
        yPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: ".search-gallery-grid",
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      // 오프닝 애니메이션
      gsap.from(".search-gallery-item", {
        y: 80,
        opacity: 0,
        duration: 1.2,
        stagger: 0.06,
        ease: "power3.out",
      });
    }, containerRef);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ctx.revert();
    };
  }, [tab]);

  return (
    <div className="searchPage" ref={containerRef}>
      {/* 상단 컨트롤 */}
      <header className="searchTop">
        <h2 className="searchTitle">Search</h2>

        <div className="searchTabs">
          {TABS.map((t) => {
            const locked = isLocked(t);
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                className={`searchTab ${active ? "is-active" : ""}`}
                onClick={() => onChangeTab(t)}
                disabled={locked}
                title={locked ? "로그인이 필요합니다" : ""}
              >
                {t} {locked ? "🔒" : ""}
              </button>
            );
          })}
        </div>

        <div className="searchControls">
          <form className="searchForm" onSubmit={onSubmit}>
            <input
              className="searchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="작품명/작가명/ID 검색"
              disabled={tab !== "artwork"}
            />
            <button className="searchBtn" type="submit" disabled={tab !== "artwork"}>
              검색
            </button>
          </form>

          <select
            className="searchSelect"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            disabled={tab !== "artwork"}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="views">조회수순</option>
          </select>
        </div>
      </header>

      {/* 잠금 탭 안내 */}
      {isLocked(tab) ? (
        <div className="searchPanel searchPanel--dashed">이 탭은 로그인 후 사용 가능합니다.</div>
      ) : tab !== "artwork" ? (
        <div className="searchPanel searchPanel--dashed">
          현재는 <b>artwork</b> 탭만 목업 연결되어 있습니다.
        </div>
      ) : filteredArtworks.length === 0 ? (
        <div className="searchPanel searchPanel--dashed">검색 결과가 없습니다.</div>
      ) : (
        <>
          {/* 고정 텍스트(원하면 제거 가능) */}
          <div className="searchHeroText" aria-hidden="true">
            <h1>SEARCH</h1>
            <p>Artwork Discovery</p>
          </div>

          {/* 3열 갤러리 그리드 */}
          <div className="search-gallery-grid">
            {/* col-1 */}
            <div className="search-gallery-col search-col-1">
              {col1.map((a) => {
                const thumb = a.thumbnail ?? a.src;
                const title = a.title ?? `Artwork ${a.id}`;
                const artist = a.artist ?? "—";

                return (
                  <Link
                    to={DETAIL_PATH(a.id)}
                    key={a.id}
                    className="search-gallery-item"
                    aria-label={`Open artwork: ${title}`}
                  >
                    <div className="search-img-box">
                      <img src={thumb} alt={title} loading="lazy" />

                      {/* ✅ 호버 오버레이 정보 */}
                      <div className="search-hoverInfo">
                        <div className="search-hoverTitle">{title}</div>
                        <div className="search-hoverMeta">
                          <span className="search-hoverArtist">{artist}</span>
                          <span className="search-hoverStats">
                            👁 {a.views ?? "—"} · ♥ {a.likes ?? "—"}
                          </span>
                        </div>
                        <div className="search-hoverDate">{formatDate(a.createdAt)}</div>
                      </div>
                    </div>

                    {/* 아래 정보(원하면 삭제 가능) */}
                    <div className="search-item-info">
                      <span className="search-info-title">{title}</span>
                      <span className="search-info-artist">{artist}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* col-2 */}
            <div className="search-gallery-col search-col-2">
              {col2.map((a) => {
                const thumb = a.thumbnail ?? a.src;
                const title = a.title ?? `Artwork ${a.id}`;
                const artist = a.artist ?? "—";

                return (
                  <Link to={DETAIL_PATH(a.id)} key={a.id} className="search-gallery-item">
                    <div className="search-img-box">
                      <img src={thumb} alt={title} loading="lazy" />
                      <div className="search-hoverInfo">
                        <div className="search-hoverTitle">{title}</div>
                        <div className="search-hoverMeta">
                          <span className="search-hoverArtist">{artist}</span>
                          <span className="search-hoverStats">
                            👁 {a.views ?? "—"} · ♥ {a.likes ?? "—"}
                          </span>
                        </div>
                        <div className="search-hoverDate">{formatDate(a.createdAt)}</div>
                      </div>
                    </div>
                    <div className="search-item-info">
                      <span className="search-info-title">{title}</span>
                      <span className="search-info-artist">{artist}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* col-3 */}
            <div className="search-gallery-col search-col-3">
              {col3.map((a) => {
                const thumb = a.thumbnail ?? a.src;
                const title = a.title ?? `Artwork ${a.id}`;
                const artist = a.artist ?? "—";

                return (
                  <Link to={DETAIL_PATH(a.id)} key={a.id} className="search-gallery-item">
                    <div className="search-img-box">
                      <img src={thumb} alt={title} loading="lazy" />
                      <div className="search-hoverInfo">
                        <div className="search-hoverTitle">{title}</div>
                        <div className="search-hoverMeta">
                          <span className="search-hoverArtist">{artist}</span>
                          <span className="search-hoverStats">
                            👁 {a.views ?? "—"} · ♥ {a.likes ?? "—"}
                          </span>
                        </div>
                        <div className="search-hoverDate">{formatDate(a.createdAt)}</div>
                      </div>
                    </div>
                    <div className="search-item-info">
                      <span className="search-info-title">{title}</span>
                      <span className="search-info-artist">{artist}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
