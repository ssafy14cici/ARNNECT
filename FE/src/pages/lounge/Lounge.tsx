// FE/src/pages/lounge/Lounge.tsx
import { useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./lounge.css";
import { useAuthStore } from "../../features/auth/store";

type Role = "general" | "artist";
type TabKey = "collectbook" | "taste" | "quiz" | "ticket" | "portfolio" | "fan-letter";
type Tab = { key: TabKey; title: string; desc: string; to: string };

function normalizeRole(role: unknown): Role {
  if (role === "artist" || role === "ARTIST") return "artist";
  return "general";
}

export default function Lounge() {
  const rawRole = useAuthStore((s) => s.role);
  const role = normalizeRole(rawRole);

  // ✅ B안: 라운지 내부 라우트로만 이동(상대경로)
  const tabs: Tab[] = useMemo(() => {
    return role === "artist"
      ? [
          { key: "ticket", title: "QR 티켓", desc: "티켓 발급/관리", to: "ticket" },
          { key: "portfolio", title: "포트폴리오", desc: "작가 정보/작품", to: "portfolio" },
          { key: "fan-letter", title: "팬레터", desc: "질문/답변", to: "fan-letter" },
        ]
      : [
          { key: "collectbook", title: "컬렉트북", desc: "스캔한 티켓/작품 기록", to: "collectbook" },
          { key: "taste", title: "취향분석", desc: "선호/활동 기반 요약", to: "taste" },
          { key: "quiz", title: "퀴즈", desc: "작품/작가 기반 퀴즈", to: "quiz" },
        ];
  }, [role]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeTop">
          <div>
            <h1 className="loungeTitle">Lounge</h1>
            <p className="loungeDesc">내 기능 허브 (Role Split)</p>
          </div>
          <div className="loungeRoleChip">{role}</div>
        </div>

        <div className="loungeTabs">
          {tabs.map((t) => (
            <NavLink
              key={t.key}
              to={t.to}
              end
              className={({ isActive }) => `loungeTabBtn ${isActive ? "active" : ""}`}
            >
              <div className="loungeTabTitle">{t.title}</div>
              <div className="loungeTabDesc">{t.desc}</div>
            </NavLink>
          ))}
        </div>

        {/* ✅ B안 핵심: 라운지 내부에서 컨텐츠가 아래에 렌더링 */}
        <Outlet />
      </section>
    </main>
  );
}
