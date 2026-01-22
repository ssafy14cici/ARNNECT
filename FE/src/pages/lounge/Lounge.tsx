// src/pages/lounge/Lounge.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";

type TabKey = "collection" | "taste" | "quiz";

const TABS: { key: TabKey; label: string; path: string }[] = [
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
