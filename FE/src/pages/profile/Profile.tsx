// import { useParams } from "react-router-dom";
// export default function Profile() {
//   const { id } = useParams();
//   return <div>Profile: {id}</div>;
// }

// src/pages/profile/Profile.tsx
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

type TabKey = "feed" | "collection";

export default function Profile() {
  const nav = useNavigate();
  const loc = useLocation();
  const { id } = useParams<{ id: string }>();

  const base = `/profile/${id ?? "me"}`;

  const tabs: { key: TabKey; label: string; path: string }[] = [
    { key: "feed", label: "Feed", path: `${base}/feed` },
    { key: "collection", label: "Collection book", path: `${base}/collection` },
  ];

  const activePath = loc.pathname;

  return (
    <div style={{ width: "min(980px, 92vw)", margin: "0 auto", paddingBottom: 64 }}>
      {/* ===== 공개 프로필 헤더 ===== */}
      <section style={{ textAlign: "center", padding: "32px 0" }}>
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
        >
          <img
            src="/avatar.png"   // ✅ 실제 아바타 이미지 경로
            alt="profile avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <div style={{ marginTop: 16, fontSize: 22 }}>public_user_{id}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 42, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>following</div>
            <div>123</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>followers</div>
            <div>45</div>
          </div>
        </div>
      </section>

      {/* ===== 탭(2개만) ===== */}
      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 14,
        }}
      >
        {tabs.map((t) => {
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

      <section style={{ marginTop: 24 }}>
        <Outlet />
      </section>
    </div>
  );
}
