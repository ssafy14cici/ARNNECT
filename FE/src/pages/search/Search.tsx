// FE/src/pages/search/Search.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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

  // ✅ (선택) 있으면 tag/user 탭 품질이 좋아짐
  tags?: string[];
  uploader?: string;
};

type GalleryItem = {
  key: string;
  href: string;
  thumb: string;
  title: string;
  metaLeft: string;
  metaRight: string;
  dateIso?: string;
};

const artworks = rawArtworks as unknown as Artwork[];

// 프로젝트 라우트에 맞게 수정
const DETAIL_PATH = (id: string) => `/artworks/${id}`;
const TABS: Tab[] = ["artist", "artwork", "tag", "user"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

// tags/uploader가 원본 데이터에 없을 때도 “탭이 동작”하게 만드는 fallback
const TAG_POOL = [
  "회화",
  "드로잉",
  "사진",
  "조각",
  "추상",
  "인물",
  "풍경",
  "모노톤",
  "컬러풀",
  "미니멀",
  "컨셉추얼",
  "아날로그",
  "디지털",
];

function genTags(seed: string) {
  const h = hashCode(seed);
  const a = TAG_POOL[h % TAG_POOL.length];
  const b = TAG_POOL[(h >> 3) % TAG_POOL.length];
  return a === b ? [a] : [a, b];
}

function getTags(a: Artwork) {
  if (a.tags && a.tags.length > 0) return a.tags;
  return genTags(String(a.id));
}

function getUploader(a: Artwork) {
  if (a.uploader && a.uploader.trim()) return a.uploader.trim();
  // 업로더가 없으면 임시 생성(목업용)
  return `user_${String(a.id).slice(0, 4)}`;
}

function toMs(iso?: string) {
  if (!iso) return null;
  const ms = +new Date(iso);
  return Number.isFinite(ms) ? ms : null;
}

type Agg = {
  name: string;
  count: number;
  totalViews: number;
  totalLikes: number;
  latestAtMs: number | null;
  oldestAtMs: number | null;
  latestIso?: string;
  oldestIso?: string;
  thumb: string;
};

function sortAggList(list: Agg[], sort: Sort) {
  const byStr = (a: string, b: string) => a.localeCompare(b, "ko");

  if (sort === "views") {
    return list.sort((a, b) => b.totalViews - a.totalViews || byStr(a.name, b.name));
  }
  if (sort === "oldest") {
    // 오래된순: oldestAtMs 오름차순(없으면 뒤로)
    return list.sort((a, b) => {
      const ta = a.oldestAtMs ?? Number.POSITIVE_INFINITY;
      const tb = b.oldestAtMs ?? Number.POSITIVE_INFINITY;
      return ta - tb || byStr(a.name, b.name);
    });
  }
  // 최신순: latestAtMs 내림차순(없으면 뒤로)
  return list.sort((a, b) => {
    const ta = a.latestAtMs ?? Number.NEGATIVE_INFINITY;
    const tb = b.latestAtMs ?? Number.NEGATIVE_INFINITY;
    return tb - ta || byStr(a.name, b.name);
  });
}

export default function Search() {
  const { isLoggedIn } = useAuthStore();
  const location = useLocation();
  const basePath = location.pathname;

  const [params, setParams] = useSearchParams();

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

  // ✅ URL query로 탭/검색/정렬 유지(선택이지만, 탭 전환 UX가 좋아짐)
  useEffect(() => {
    const t = params.get("tab");
    const qq = params.get("q");
    const s = params.get("sort");

    if (t && (TABS as string[]).includes(t)) setTab(t as Tab);
    if (qq != null) setQ(qq);
    if (s && (["latest", "oldest", "views"] as string[]).includes(s)) setSort(s as Sort);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    next.set("sort", sort);
    if (q.trim()) next.set("q", q.trim());
    setParams(next, { replace: true });
  }, [tab, q, sort, setParams]);

  const placeholder = useMemo(() => {
    if (tab === "artwork") return "작품명/작가명/태그/유저/ID 검색";
    if (tab === "artist") return "작가명 검색";
    if (tab === "tag") return "태그 검색";
    return "유저 검색";
  }, [tab]);

  const controlsDisabled = isLocked(tab);

  const makeHrefToArtworkSearch = (term: string) => {
    const p = new URLSearchParams();
    p.set("tab", "artwork");
    p.set("sort", sort);
    if (term) p.set("q", term);
    return `${basePath}?${p.toString()}`;
  };

  // ✅ 탭별 결과를 “GalleryItem”으로 통일해서 렌더
  const galleryItems = useMemo<GalleryItem[]>(() => {
    if (isLocked(tab)) return [];

    const term = q.trim().toLowerCase();
    const includes = (hay: string) => (!term ? true : hay.toLowerCase().includes(term));

    // ----------------
    // artwork 탭
    // ----------------
    if (tab === "artwork") {
      let list = [...artworks];

      if (term) {
        list = list.filter((x) => {
          const tags = getTags(x).join(" ");
          const uploader = getUploader(x);
          const hay = `${x.title ?? ""} ${x.artist ?? ""} ${tags} ${uploader} ${x.id}`;
          return includes(hay);
        });
      }

      if (sort === "latest") {
        list.sort((a, b) => {
          const ta = toMs(a.createdAt) ?? Number.NEGATIVE_INFINITY;
          const tb = toMs(b.createdAt) ?? Number.NEGATIVE_INFINITY;
          return tb - ta;
        });
      } else if (sort === "oldest") {
        list.sort((a, b) => {
          const ta = toMs(a.createdAt) ?? Number.POSITIVE_INFINITY;
          const tb = toMs(b.createdAt) ?? Number.POSITIVE_INFINITY;
          return ta - tb;
        });
      } else {
        list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      }

      return list.map((a) => {
        const thumb = a.thumbnail ?? a.src;
        const title = a.title ?? `Artwork ${a.id}`;
        const artist = a.artist ?? "—";
        return {
          key: `artwork:${a.id}`,
          href: DETAIL_PATH(a.id),
          thumb,
          title,
          metaLeft: artist,
          metaRight: `👁 ${a.views ?? "—"} · ♥ ${a.likes ?? "—"}`,
          dateIso: a.createdAt,
        };
      });
    }

    // ----------------
    // artist / tag / user 탭: artworks를 그룹핑해서 목업 리스트 생성
    // ----------------
    const map = new Map<string, Agg>();

    for (const a of artworks) {
      const createdMs = toMs(a.createdAt);
      const thumb = a.thumbnail ?? a.src;
      const views = a.views ?? 0;
      const likes = a.likes ?? 0;

      const keys =
        tab === "artist"
          ? [a.artist ?? "Unknown Artist"]
          : tab === "tag"
            ? getTags(a).map((t) => t.trim()).filter(Boolean)
            : [getUploader(a)];

      for (const key of keys) {
        if (!key) continue;

        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            name: key,
            count: 1,
            totalViews: views,
            totalLikes: likes,
            latestAtMs: createdMs,
            oldestAtMs: createdMs,
            latestIso: a.createdAt,
            oldestIso: a.createdAt,
            thumb,
          });
          continue;
        }

        prev.count += 1;
        prev.totalViews += views;
        prev.totalLikes += likes;

        // latest
        if (createdMs != null) {
          if (prev.latestAtMs == null || createdMs > prev.latestAtMs) {
            prev.latestAtMs = createdMs;
            prev.latestIso = a.createdAt;
            prev.thumb = thumb; // 최신 작품 썸네일로 갱신
          }
          // oldest
          if (prev.oldestAtMs == null || createdMs < prev.oldestAtMs) {
            prev.oldestAtMs = createdMs;
            prev.oldestIso = a.createdAt;
          }
        }
      }
    }

    let aggs = Array.from(map.values());

    // 탭별 검색
    if (term) {
      aggs = aggs.filter((x) => includes(x.name));
    }

    aggs = sortAggList(aggs, sort);

    // 탭별 GalleryItem 변환
    return aggs.map((x) => {
      const dateIso = sort === "oldest" ? x.oldestIso : x.latestIso;

      if (tab === "artist") {
        return {
          key: `artist:${x.name}`,
          href: makeHrefToArtworkSearch(x.name), // 작가 클릭 => 작품 검색으로 연결
          thumb: x.thumb,
          title: x.name,
          metaLeft: `작품 ${x.count}개`,
          metaRight: `👁 ${x.totalViews} · ♥ ${x.totalLikes}`,
          dateIso,
        };
      }

      if (tab === "tag") {
        return {
          key: `tag:${x.name}`,
          href: makeHrefToArtworkSearch(x.name), // 태그 클릭 => 작품 검색(태그 포함 검색)
          thumb: x.thumb,
          title: `#${x.name}`,
          metaLeft: `작품 ${x.count}개`,
          metaRight: `👁 ${x.totalViews} · ♥ ${x.totalLikes}`,
          dateIso,
        };
      }

      // user
      return {
        key: `user:${x.name}`,
        href: makeHrefToArtworkSearch(x.name), // 유저 클릭 => 작품 검색(업로더 포함 검색)
        thumb: x.thumb,
        title: x.name,
        metaLeft: `업로드 ${x.count}개`,
        metaRight: `👁 ${x.totalViews} · ♥ ${x.totalLikes}`,
        dateIso,
      };
    });
  }, [tab, q, sort, isLoggedIn, basePath]);

  // 3열 분배
  const col1 = useMemo(() => galleryItems.filter((_, i) => i % 3 === 0), [galleryItems]);
  const col2 = useMemo(() => galleryItems.filter((_, i) => i % 3 === 1), [galleryItems]);
  const col3 = useMemo(() => galleryItems.filter((_, i) => i % 3 === 2), [galleryItems]);

  useEffect(() => {
    // 잠금 탭이면 애니메이션/스크롤 세팅 불필요
    if (isLocked(tab)) return;

    // 그리드가 없으면(결과 없음) 스킵
    const grid = containerRef.current?.querySelector(".search-gallery-grid");
    if (!grid) return;

    // 1) Lenis (smooth scroll)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // 2) GSAP parallax + opening
    const ctx = gsap.context(() => {
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
    // 탭 전환 시에만 재설정(검색어/정렬로는 재생성하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isLoggedIn]);

  const renderCol = (colClass: string, items: GalleryItem[]) => {
    return (
      <div className={`search-gallery-col ${colClass}`}>
        {items.map((it) => (
          <Link to={it.href} key={it.key} className="search-gallery-item" aria-label={`Open: ${it.title}`}>
            <div className="search-img-box">
              <img src={it.thumb} alt={it.title} loading="lazy" />

              <div className="search-hoverInfo">
                <div className="search-hoverTitle">{it.title}</div>
                <div className="search-hoverMeta">
                  <span className="search-hoverArtist">{it.metaLeft}</span>
                  <span className="search-hoverStats">{it.metaRight}</span>
                </div>
                <div className="search-hoverDate">{formatDate(it.dateIso)}</div>
              </div>
            </div>

            <div className="search-item-info">
              <span className="search-info-title">{it.title}</span>
              <span className="search-info-artist">{it.metaLeft}</span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

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
              placeholder={placeholder}
              disabled={controlsDisabled}
            />
            <button className="searchBtn" type="submit" disabled={controlsDisabled}>
              검색
            </button>
          </form>

          <select
            className="searchSelect"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            disabled={controlsDisabled}
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
      ) : galleryItems.length === 0 ? (
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
            {renderCol("search-col-1", col1)}
            {renderCol("search-col-2", col2)}
            {renderCol("search-col-3", col3)}
          </div>
        </>
      )}
    </div>
  );
}
