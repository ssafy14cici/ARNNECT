// FE/src/pages/search/Search.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import "./search.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

import { fetchSearchArtworks, type SearchArtwork } from "../../features/search/api";

gsap.registerPlugin(ScrollTrigger);

// --- Constants & Types ---
const ITEMS_PER_PAGE = 10;
const TABS: Tab[] = ["artist", "artwork", "tag", "user"];
const DETAIL_PATH = (id: string) => `/artworks/${id}`;

type Tab = "artist" | "artwork" | "tag" | "user";
type Sort = "latest" | "oldest" | "views";

// SearchArtwork를 Search 화면에서 쓰는 Artwork 형태로 호환
type Artwork = {
  id: string;
  src: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  likes?: number;
  views?: number;
  createdAt?: string;
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

// --- Helper Functions ---
function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

const TAG_POOL = ["회화", "드로잉", "사진", "조각", "추상", "인물", "풍경", "모노톤", "컬러풀", "미니멀"];

function genTags(seed: string) {
  const h = hashCode(seed);
  return [TAG_POOL[h % TAG_POOL.length]];
}

function getTags(a: Artwork) {
  if (a.tags && a.tags.length > 0) return a.tags;
  return genTags(String(a.id));
}

function getUploader(a: Artwork) {
  if (a.uploader && a.uploader.trim()) return a.uploader.trim();
  return `user_${String(a.id).slice(0, 4)}`;
}

function toMs(iso?: string) {
  if (!iso) return null;
  const ms = +new Date(iso);
  return Number.isFinite(ms) ? ms : null;
}

function sortAggList(list: Agg[], sort: Sort) {
  const byStr = (a: string, b: string) => a.localeCompare(b, "ko");
  if (sort === "views") {
    return list.sort((a, b) => b.totalViews - a.totalViews || byStr(a.name, b.name));
  }
  if (sort === "oldest") {
    return list.sort((a, b) => {
      const ta = a.oldestAtMs ?? Number.POSITIVE_INFINITY;
      const tb = b.oldestAtMs ?? Number.POSITIVE_INFINITY;
      return ta - tb || byStr(a.name, b.name);
    });
  }
  return list.sort((a, b) => {
    const ta = a.latestAtMs ?? Number.NEGATIVE_INFINITY;
    const tb = b.latestAtMs ?? Number.NEGATIVE_INFINITY;
    return tb - ta || byStr(a.name, b.name);
  });
}

export default function Search() {
  // ✅ store selector로 변경
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const location = useLocation();
  const basePath = location.pathname;
  const [params, setParams] = useSearchParams();

  // ✅ 서버에서 받은 작품 리스트 state
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const reqSeq = useRef(0);

  // States
  const [tab, setTab] = useState<Tab>("artwork");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [page, setPage] = useState(1);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const isLocked = useCallback(
    (t: Tab) => (t === "tag" || t === "user") && !isLoggedIn,
    [isLoggedIn],
  );

  const onChangeTab = (t: Tab) => {
    if (isLocked(t)) return;
    setTab(t);
    setPage(1);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const makeHrefToArtworkSearch = useCallback(
    (term: string) => {
      const p = new URLSearchParams();
      p.set("tab", "artwork");
      p.set("sort", sort);
      if (term) p.set("q", term);
      return `${basePath}?${p.toString()}`;
    },
    [basePath, sort],
  );

  // URL Sync - Initial Load
  useEffect(() => {
    const t = params.get("tab");
    const qq = params.get("q");
    const s = params.get("sort");
    const p = params.get("page");

    if (t && (TABS as string[]).includes(t)) setTab(t as Tab);
    if (qq !== null) setQ(qq);
    if (s && (["latest", "oldest", "views"] as string[]).includes(s)) setSort(s as Sort);
    if (p) setPage(Number(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update URL Params
  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    next.set("sort", sort);
    if (q.trim()) next.set("q", q.trim());
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [tab, q, sort, page, setParams]);

  const placeholder = useMemo(() => {
    if (tab === "artwork") return "Search Artworks...";
    if (tab === "artist") return "Search Artists...";
    if (tab === "tag") return "Search Tags...";
    return "Search Users...";
  }, [tab]);

  const controlsDisabled = isLocked(tab);

  // ✅ 서버 fetch: q 변경 시 (debounce + stale response 방지)
  useEffect(() => {
    if (isLocked(tab)) {
      setArtworks([]);
      setRemoteError(null);
      setRemoteLoading(false);
      return;
    }

    const mySeq = ++reqSeq.current;
    const timer = window.setTimeout(async () => {
      setRemoteLoading(true);
      setRemoteError(null);

      try {
        const list: SearchArtwork[] = await fetchSearchArtworks(q);
        if (reqSeq.current !== mySeq) return;

        // SearchArtwork -> Artwork 호환
        setArtworks(
          list.map((x) => ({
            id: x.id,
            src: x.src,
            thumbnail: x.thumbnail ?? x.src,
            title: x.title,
            artist: x.artist,
            likes: x.likes ?? 0,
            views: x.views ?? 0,
            createdAt: x.createdAt,
            tags: x.tags,
            uploader: x.uploader,
          })),
        );
      } catch (e) {
        if (reqSeq.current !== mySeq) return;
        setRemoteError(e instanceof Error ? e.message : "검색 로딩 실패");
        setArtworks([]);
      } finally {
        if (reqSeq.current === mySeq) setRemoteLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [q, tab, isLocked]);

  // ✅ 전체 데이터 필터링 & 정렬
  const allFilteredItems = useMemo<GalleryItem[]>(() => {
    if (isLocked(tab)) return [];

    const term = q.trim().toLowerCase();
    const includes = (hay: string) => (!term ? true : hay.toLowerCase().includes(term));

    if (tab === "artwork") {
      let list = [...artworks];

      // 서버가 이미 검색해줬더라도, 안전하게 한 번 더 필터링 유지
      if (term) {
        list = list.filter((x) => {
          const tags = getTags(x).join(" ");
          const uploader = getUploader(x);
          const hay = `${x.title ?? ""} ${x.artist ?? ""} ${tags} ${uploader} ${x.id}`;
          return includes(hay);
        });
      }

      if (sort === "latest") {
        list.sort((a, b) => (toMs(b.createdAt) ?? -Infinity) - (toMs(a.createdAt) ?? -Infinity));
      } else if (sort === "oldest") {
        list.sort((a, b) => (toMs(a.createdAt) ?? Infinity) - (toMs(b.createdAt) ?? Infinity));
      } else {
        list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      }

      return list.map((a) => ({
        key: `artwork:${a.id}`,
        href: DETAIL_PATH(a.id),
        thumb: a.thumbnail ?? a.src,
        title: a.title ?? `Artwork ${a.id}`,
        metaLeft: a.artist ?? "Unknown",
        metaRight: "",
        dateIso: a.createdAt,
      }));
    }

    // artist / tag / user 탭은 작품 리스트를 집계해서 링크는 "artwork 검색"으로 유도
    const map = new Map<string, Agg>();
    for (const a of artworks) {
      const createdMs = toMs(a.createdAt);
      const thumb = a.thumbnail ?? a.src;
      const views = a.views ?? 0;
      const likes = a.likes ?? 0;

      const keys =
        tab === "artist"
          ? [a.artist ?? "Unknown"]
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

        if (createdMs != null) {
          if (prev.latestAtMs == null || createdMs > prev.latestAtMs) {
            prev.latestAtMs = createdMs;
            prev.latestIso = a.createdAt;
            prev.thumb = thumb;
          }
          if (prev.oldestAtMs == null || createdMs < prev.oldestAtMs) {
            prev.oldestAtMs = createdMs;
            prev.oldestIso = a.createdAt;
          }
        }
      }
    }

    let aggs = Array.from(map.values());
    if (term) aggs = aggs.filter((x) => includes(x.name));
    aggs = sortAggList(aggs, sort);

    return aggs.map((x) => ({
      key: `${tab}:${x.name}`,
      href: makeHrefToArtworkSearch(x.name),
      thumb: x.thumb,
      title: tab === "tag" ? `#${x.name}` : x.name,
      metaLeft: `${x.count} works`,
      metaRight: "",
      dateIso: sort === "oldest" ? x.oldestIso : x.latestIso,
    }));
  }, [tab, q, sort, artworks, isLocked, makeHrefToArtworkSearch]);

  const totalItems = allFilteredItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const currentItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return allFilteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [allFilteredItems, page]);

  const col1 = useMemo(() => currentItems.filter((_, i) => i % 3 === 0), [currentItems]);
  const col2 = useMemo(() => currentItems.filter((_, i) => i % 3 === 1), [currentItems]);
  const col3 = useMemo(() => currentItems.filter((_, i) => i % 3 === 2), [currentItems]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // GSAP & Lenis Setup
  useEffect(() => {
    if (isLocked(tab)) return;
    const grid = containerRef.current?.querySelector(".search-gallery-grid");
    if (!grid) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.1,
    });

    lenis.on("scroll", ScrollTrigger.update);
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

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
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: ".search-gallery-grid",
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
      gsap.from(".search-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.05,
        ease: "power3.out",
      });
    }, containerRef);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ctx.revert();
    };
  }, [tab, isLocked, currentItems]);

  const renderCol = (colClass: string, items: GalleryItem[]) => (
    <div className={`search-gallery-col ${colClass}`}>
      {items.map((it) => (
        <Link to={it.href} key={it.key} className="search-card">
          <div className="search-card-media">
            <img src={it.thumb} alt={it.title} loading="lazy" />
            <div className="search-card-overlay">
              <span className="view-btn">View Detail</span>
            </div>
          </div>
          <div className="search-card-info">
            <h3 className="card-title">{it.title}</h3>
            <p className="card-artist">{it.metaLeft}</p>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="search-page" ref={containerRef}>
      <header className={`search-header ${isFocused ? "focused" : ""}`}>
        <div className="search-container">
          <form className="search-input-wrapper" onSubmit={onSubmit}>
            <input
              type="text"
              className="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={controlsDisabled}
            />
            <button type="submit" className="search-icon-btn" disabled={controlsDisabled}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" />
              </svg>
            </button>
          </form>

          <div className="search-toolbar">
            <nav className="search-tabs">
              {TABS.map((t) => {
                const locked = isLocked(t);
                return (
                  <button
                    key={t}
                    className={`filter-btn ${tab === t ? "active" : ""}`}
                    onClick={() => onChangeTab(t)}
                    disabled={locked}
                    type="button"
                  >
                    {t} {locked && "🔒"}
                  </button>
                );
              })}
            </nav>

            <div className="search-sort">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                disabled={controlsDisabled}
                className="sort-select"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="views">Popular</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="search-body">
        {isLocked(tab) ? (
          <div className="search-empty">
            <p>Please log in to search by {tab}.</p>
          </div>
        ) : remoteLoading ? (
          <div className="search-empty">
            <p>Loading...</p>
          </div>
        ) : remoteError ? (
          <div className="search-empty">
            <p>{remoteError}</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="search-empty">
            <p>No results found.</p>
          </div>
        ) : (
          <>
            <div className="search-gallery-grid">
              {renderCol("search-col-1", col1)}
              {renderCol("search-col-2", col2)}
              {renderCol("search-col-3", col3)}
            </div>

            {totalPages > 1 && (
              <div className="search-pagination">
                <button
                  className="page-control-btn"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  type="button"
                >
                  &larr; Prev
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`page-number-btn ${p === page ? "active" : ""}`}
                      onClick={() => handlePageChange(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  className="page-control-btn"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  type="button"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
