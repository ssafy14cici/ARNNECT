// // // import { useAuthStore } from "../../stores/authStore";

// // // export default function Lounge() {
// // //   const { role } = useAuthStore();
// // //   return <div>Lounge (role: {role})</div>;
// // // }

// // // src/pages/lounge/Lounge.tsx
// // import { useEffect, useMemo, useRef, useState } from "react";
// // import { useNavigate } from "react-router-dom";

// // type TabKey = "feed" | "collection" | "taste" | "quiz";

// // type FeedItem = {
// //   id: string;
// //   title: string;
// //   imageUrl: string;
// // };

// // const TABS: { key: TabKey; label: string }[] = [
// //   { key: "feed", label: "My Feed" },
// //   { key: "collection", label: "My collection book" },
// //   { key: "taste", label: "My Taste" },
// //   { key: "quiz", label: "My Quiz" },
// // ];

// // // 데모 이미지(이미 프로젝트에 있는 public/art/a1.jpg...를 재사용)
// // const BASE_IMAGES = [
// //   "/art/a1.jpg",
// //   "/art/a2.jpg",
// //   "/art/a3.jpg",
// //   "/art/a4.jpg",
// //   "/art/a5.jpg",
// //   "/art/a6.jpg",
// //   "/art/a7.jpg",
// //   "/art/a8.jpg",
// // ];

// // function makeBatch(startIndex: number, count: number): FeedItem[] {
// //   return Array.from({ length: count }).map((_, i) => {
// //     const idx = startIndex + i;
// //     const img = BASE_IMAGES[idx % BASE_IMAGES.length];
// //     return {
// //       id: String(idx),
// //       title: `Artwork ${idx}`,
// //       imageUrl: img,
// //     };
// //   });
// // }

// // export default function Lounge() {
// //   const nav = useNavigate();

// //   // ---- 화면 상태 ----
// //   const [activeTab, setActiveTab] = useState<TabKey>("feed");

// //   // ---- 무한 스크롤용 데이터 ----
// //   const [items, setItems] = useState<FeedItem[]>(() => makeBatch(1, 8));
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [hasMore, setHasMore] = useState(true);

// //   const sentinelRef = useRef<HTMLDivElement | null>(null);

// //   const profile = useMemo(
// //     () => ({
// //       username: "artlover_2024",
// //       following: 12345,
// //       followers: 1234,
// //     }),
// //     []
// //   );

// //   // ---- 탭 바뀌면(데모) 목록 리셋 ----
// //   useEffect(() => {
// //     // 실제로는 탭별 API 호출하면 됨
// //     setItems(makeBatch(1, 8));
// //     setHasMore(true);
// //   }, [activeTab]);

// //   // ---- 무한 스크롤 로더 ----
// //   const loadMore = async () => {
// //     if (isLoading || !hasMore) return;
// //     setIsLoading(true);

// //     // 데모: 네트워크 대신 짧게 대기 + 더 추가
// //     await new Promise((r) => setTimeout(r, 450));

// //     setItems((prev) => {
// //       const nextStart = prev.length + 1;
// //       const next = makeBatch(nextStart, 6);
// //       const merged = [...prev, ...next];

// //       // 데모 제한(원하면 제거): 40개 넘어가면 더 없다고 처리
// //       if (merged.length >= 40) setHasMore(false);
// //       return merged;
// //     });

// //     setIsLoading(false);
// //   };

// //   // ---- IntersectionObserver: sentinel이 보이면 loadMore ----
// //   useEffect(() => {
// //     const el = sentinelRef.current;
// //     if (!el) return;

// //     const io = new IntersectionObserver(
// //       (entries) => {
// //         if (entries[0]?.isIntersecting) loadMore();
// //       },
// //       { root: null, rootMargin: "600px 0px", threshold: 0 }
// //     );

// //     io.observe(el);
// //     return () => io.disconnect();
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [sentinelRef.current, hasMore, isLoading]);

// //   return (
// //     <div style={styles.wrap}>
// //       {/* ===== 프로필 헤더 ===== */}
// //       <section style={styles.profileSection} aria-label="Profile">
// //         <div style={styles.avatar} aria-hidden />

// //         <div style={styles.userBlock}>
// //           <div style={styles.username}>{profile.username}</div>

// //           <div style={styles.statsRow}>
// //             <div style={styles.stat}>
// //               <div style={styles.statLabel}>following</div>
// //               <div style={styles.statValue}>{profile.following}</div>
// //             </div>
// //             <div style={styles.stat}>
// //               <div style={styles.statLabel}>followers</div>
// //               <div style={styles.statValue}>{profile.followers}</div>
// //             </div>
// //           </div>
// //         </div>
// //       </section>

// //       {/* ===== 탭 ===== */}
// //       <nav style={styles.tabs} aria-label="Profile tabs">
// //         {TABS.map((t) => {
// //           const active = t.key === activeTab;
// //           return (
// //             <button
// //               key={t.key}
// //               type="button"
// //               onClick={() => setActiveTab(t.key)}
// //               style={{
// //                 ...styles.tabBtn,
// //                 ...(active ? styles.tabBtnActive : styles.tabBtnInactive),
// //               }}
// //               aria-current={active ? "page" : undefined}
// //             >
// //               {t.label}
// //             </button>
// //           );
// //         })}
// //       </nav>

// //       {/* ===== 그리드 ===== */}
// //       <section style={styles.gridSection} aria-label="Grid">
// //         <div style={styles.grid}>
// //           {items.map((it) => (
// //             <button
// //               key={it.id}
// //               type="button"
// //               style={styles.card}
// //               onClick={() => {
// //                 // 작품 상세로 이동(가드 적용되어 있으니 로그아웃이면 로그인으로 튕김)
// //                 nav(`/artworks/${it.id}`);
// //               }}
// //               aria-label={`Open artwork ${it.title}`}
// //             >
// //               <img src={it.imageUrl} alt={it.title} style={styles.img} />
// //             </button>
// //           ))}
// //         </div>

// //         {/* sentinel: 여기 보이면 더 불러옴 */}
// //         <div ref={sentinelRef} />

// //         {/* 로딩/끝 안내 */}
// //         <div style={styles.footerHint}>
// //           {isLoading ? "Loading..." : !hasMore ? "No more items" : ""}
// //         </div>
// //       </section>
// //     </div>
// //   );
// // }

// // const styles: Record<string, React.CSSProperties> = {
// //   wrap: {
// //     // 배경은 글로벌을 사용하므로 여기서는 안 건드림
// //     width: "min(980px, 92vw)",
// //     margin: "0 auto",
// //     padding: "28px 0 64px",
// //   },

// //   profileSection: {
// //     display: "grid",
// //     placeItems: "center",
// //     gap: 18,
// //     paddingTop: 18,
// //     paddingBottom: 18,
// //   },

// //   avatar: {
// //     width: 132,
// //     height: 132,
// //     borderRadius: "50%",
// //     background: "rgba(255,255,255,0.06)",
// //     border: "1px solid rgba(255,255,255,0.10)",
// //     boxShadow: "0 20px 80px rgba(0,0,0,0.35)",
// //   },

// //   userBlock: {
// //     textAlign: "center",
// //   },

// //   username: {
// //     fontSize: 22,
// //     letterSpacing: "0.02em",
// //     color: "var(--fg, #EDEAE3)",
// //     marginTop: 6,
// //   },

// //   statsRow: {
// //     display: "flex",
// //     gap: 42,
// //     justifyContent: "center",
// //     marginTop: 14,
// //   },

// //   stat: {
// //     textAlign: "center",
// //   },

// //   statLabel: {
// //     fontSize: 12,
// //     opacity: 0.7,
// //     color: "var(--muted, rgba(237,234,227,0.72))",
// //   },

// //   statValue: {
// //     marginTop: 4,
// //     fontSize: 14,
// //     color: "var(--fg, #EDEAE3)",
// //     letterSpacing: "0.03em",
// //   },

// //   tabs: {
// //     display: "grid",
// //     gridTemplateColumns: "repeat(4, 1fr)",
// //     gap: 14,
// //     alignItems: "center",
// //     marginTop: 18,
// //     paddingBottom: 14,
// //     borderBottom: "1px solid rgba(255,255,255,0.08)",
// //   },

// //   tabBtn: {
// //     appearance: "none",
// //     border: "1px solid rgba(255,255,255,0.12)",
// //     background: "transparent",
// //     color: "var(--fg, #EDEAE3)",
// //     padding: "12px 10px",
// //     borderRadius: 12,
// //     cursor: "pointer",
// //     fontSize: 13,
// //     letterSpacing: "0.02em",
// //     textAlign: "center",
// //     transition: "transform 140ms ease, background 140ms ease, border-color 140ms ease",
// //   },

// //   tabBtnActive: {
// //     borderColor: "rgba(120, 165, 255, 0.75)",
// //     background: "rgba(120, 165, 255, 0.10)",
// //     transform: "translateY(-1px)",
// //   },

// //   tabBtnInactive: {
// //     opacity: 0.75,
// //   },

// //   gridSection: {
// //     marginTop: 18,
// //   },

// //   grid: {
// //     display: "grid",
// //     gridTemplateColumns: "repeat(2, 1fr)",
// //     gap: 18,
// //   },

// //   card: {
// //     border: "none",
// //     padding: 0,
// //     background: "transparent",
// //     cursor: "pointer",
// //     borderRadius: 18,
// //     overflow: "hidden",
// //     boxShadow: "0 30px 120px rgba(0,0,0,0.40)",
// //     outline: "1px solid rgba(255,255,255,0.10)",
// //   },

// //   img: {
// //     width: "100%",
// //     height: "auto",
// //     display: "block",
// //     aspectRatio: "1 / 1",
// //     objectFit: "cover",
// //   },

// //   footerHint: {
// //     marginTop: 18,
// //     textAlign: "center",
// //     fontSize: 12,
// //     color: "var(--muted, rgba(237,234,227,0.65))",
// //     minHeight: 18,
// //   },
// // };

// // src/pages/lounge/Lounge.tsx
// import { Outlet, useLocation, useNavigate } from "react-router-dom";

// type TabKey = "feed" | "collection" | "taste" | "quiz";

// const TABS: { key: TabKey; label: string; path: string }[] = [
//   { key: "feed", label: "My Feed", path: "/lounge/feed" },
//   { key: "collection", label: "My collection book", path: "/lounge/collection" },
//   { key: "taste", label: "My Taste", path: "/lounge/taste" },
//   { key: "quiz", label: "My Quiz", path: "/lounge/quiz" },
// ];

// export default function Lounge() {
//   const nav = useNavigate();
//   const location = useLocation();

//   const activePath = location.pathname;

//   return (
//     <div style={{ width: "min(980px, 92vw)", margin: "0 auto", paddingBottom: 64 }}>
//       {/* ===== 프로필 영역 ===== */}
//       <section style={{ textAlign: "center", padding: "32px 0" }}>
//         <div
//           style={{
//             width: 132,
//             height: 132,
//             borderRadius: "50%",
//             background: "rgba(255,255,255,0.06)",
//             margin: "0 auto",
//           }}
//         />
//         <div style={{ marginTop: 16, fontSize: 22 }}>artlover_2024</div>

//         <div style={{ display: "flex", justifyContent: "center", gap: 42, marginTop: 12 }}>
//           <div>
//             <div style={{ fontSize: 12, opacity: 0.6 }}>following</div>
//             <div>12345</div>
//           </div>
//           <div>
//             <div style={{ fontSize: 12, opacity: 0.6 }}>followers</div>
//             <div>1234</div>
//           </div>
//         </div>
//       </section>

//       {/* ===== 탭 ===== */}
//       <nav
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(4, 1fr)",
//           gap: 14,
//           borderBottom: "1px solid rgba(255,255,255,0.08)",
//           paddingBottom: 14,
//         }}
//       >
//         {TABS.map((t) => {
//           const active = activePath.startsWith(t.path);

//           return (
//             <button
//               key={t.key}
//               type="button"
//               onClick={() => nav(t.path)}
//               style={{
//                 padding: "12px 10px",
//                 borderRadius: 12,
//                 border: active
//                   ? "1px solid rgba(120,165,255,0.75)"
//                   : "1px solid rgba(255,255,255,0.12)",
//                 background: active ? "rgba(120,165,255,0.10)" : "transparent",
//                 cursor: "pointer",
//               }}
//             >
//               {t.label}
//             </button>
//           );
//         })}
//       </nav>

//       {/* ===== 여기서 탭별 페이지가 바뀜 ===== */}
//       <section style={{ marginTop: 24 }}>
//         <Outlet />
//       </section>
//     </div>
//   );
// }

// src/pages/lounge/Lounge.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";

type TabKey = "feed" | "collection" | "taste" | "quiz";

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: "feed", label: "My Feed", path: "/lounge/feed" },
  { key: "collection", label: "My collection book", path: "/lounge/collection" },
  { key: "taste", label: "My Taste", path: "/lounge/taste" },
  { key: "quiz", label: "My Quiz", path: "/lounge/quiz" },
];

export default function Lounge() {
  const nav = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  return (
    <div style={{ width: "min(980px, 92vw)", margin: "0 auto", paddingBottom: 64 }}>
      {/* ===== 프로필 영역 ===== */}
      <section style={{ textAlign: "center", padding: "32px 0" }}>
        {/* ✅ 아바타 원형 다시 */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            margin: "0 auto",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 90px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
          aria-label="User avatar"
        >
          {/* 실제 이미지가 있으면 여기 src만 바꾸면 됨 */}
          {/* <img src="/avatar.png" alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> */}
        </div>

        <div style={{ marginTop: 16, fontSize: 22 }}>artlover_2024</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 42, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>following</div>
            <div>12345</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>followers</div>
            <div>1234</div>
          </div>
        </div>
      </section>

      {/* ===== 탭 ===== */}
      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 14,
        }}
      >
        {TABS.map((t) => {
          const active = activePath.startsWith(t.path);

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => nav(t.path)}
              style={{
                padding: "12px 10px",
                borderRadius: 12,
                border: active
                  ? "1px solid rgba(120,165,255,0.75)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: active ? "rgba(120,165,255,0.10)" : "transparent",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ===== 여기서 탭별 페이지가 바뀜 ===== */}
      <section style={{ marginTop: 24 }}>
        <Outlet />
      </section>
    </div>
  );
}
