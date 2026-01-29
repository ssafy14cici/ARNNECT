// FE/src/pages/lounge/Lounge.tsx
import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./lounge.css";
import { useAuthStore } from "../../stores/authStore";

type Role = "general" | "artist";
type TabKey = "collectbook" | "taste" | "quiz" | "ticket" | "portfolio" | "fan-letter";

function normalizeRole(role: any): Role {
  if (role === "artist" || role === "ARTIST") return "artist";
  return "general";
}

type Tab = {
  key: TabKey;
  title: string;
  desc: string;
  to: string;
};

export default function Lounge() {
  const rawRole = useAuthStore((s) => s.role);
  const role = normalizeRole(rawRole);

  const nav = useNavigate();
  const { pathname } = useLocation();

  const tabs: Tab[] = useMemo(() => {
    return role === "artist"
      ? [
          { key: "ticket", title: "QR 티켓", desc: "티켓 발급/관리", to: "/lounge/ticket" },
          { key: "portfolio", title: "포트폴리오", desc: "작가 정보/작품", to: "/lounge/portfolio" },
          { key: "fan-letter", title: "팬레터", desc: "질문/답변", to: "/lounge/fan-letter" },
        ]
      : [
          { key: "collectbook", title: "컬렉트북", desc: "스캔한 티켓/작품 기록", to: "/lounge/collectbook" },
          { key: "taste", title: "취향분석", desc: "선호/활동 기반 요약", to: "/lounge/taste" },
          { key: "quiz", title: "퀴즈", desc: "작품/작가 기반 퀴즈", to: "/lounge/quiz" },
        ];
  }, [role]);

  // URL에서 현재 탭 추출: /lounge/collectbook/scan -> collectbook
  const activeKey: TabKey = useMemo(() => {
    const seg = pathname.replace(/\/+$/, "").split("/")[2] as TabKey | undefined;
    const valid = tabs.some((t) => t.key === seg);
    return valid ? (seg as TabKey) : (role === "artist" ? "ticket" : "collectbook");
  }, [pathname, tabs, role]);

  // /lounge로 들어오면 기본 탭으로 보내기 (원래 active default 느낌 유지)
  useEffect(() => {
    const clean = pathname.replace(/\/+$/, "");
    if (clean === "/lounge") {
      nav(role === "artist" ? "/lounge/ticket" : "/lounge/collectbook", { replace: true });
    }
  }, [pathname, role, nav]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeTop">
          <div>
            <h1 className="loungeTitle">Lounge</h1>
            <p className="loungeDesc">내 활동/내 기능 허브 (Role Split)</p>
          </div>
          <div className="loungeRoleChip">{role}</div>
        </div>

        <div className="loungeTabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`loungeTabBtn ${activeKey === t.key ? "isActive" : ""}`}
              onClick={() => nav(t.to)}
            >
              <div className="loungeTabTitle">{t.title}</div>
              <div className="loungeTabDesc">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* ✅ 여기서 자식 라우트(collectbook/scan 등)가 렌더됨 */}
        <section className="loungeBody">
          <Outlet />
        </section>
      </section>
    </main>
  );
}
