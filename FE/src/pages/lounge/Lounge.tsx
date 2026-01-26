import { useEffect, useMemo, useState } from "react";
import "./lounge.css";
import { useAuthStore } from "../../stores/authStore";

import CollectBook from "./user/CollectBook";
import Taste from "./user/Taste";
import Quiz from "./user/Quiz";

import TicketQr from "./artist/TicketQr";
import Portfolio from "./artist/Portfolio";
import FanLetter from "./artist/FanLetter";

type Role = "general" | "artist";
type UserTab = "collectbook" | "taste" | "quiz";
type ArtistTab = "ticket" | "portfolio" | "fan-letter";
type Tab = UserTab | ArtistTab;

function normalizeRole(role: any): Role {
  if (role === "artist" || role === "ARTIST") return "artist";
  return "general";
}

export default function Lounge() {
  const rawRole = useAuthStore((s) => s.role);
  const role = normalizeRole(rawRole);

  const tabs = useMemo(() => {
    return role === "artist"
      ? ([
          { key: "ticket", title: "QR 티켓", desc: "티켓 발급/스캔" },
          { key: "portfolio", title: "포트폴리오", desc: "작가 정보/작품" },
          { key: "fan-letter", title: "팬레터", desc: "질문/답변" },
        ] as const)
      : ([
          { key: "collectbook", title: "컬렉트북", desc: "스캔한 티켓/작품 기록" },
          { key: "taste", title: "취향분석", desc: "선호/활동 기반 요약" },
          { key: "quiz", title: "퀴즈", desc: "작품/작가 기반 퀴즈" },
        ] as const);
  }, [role]);

  // ✅ role 기준 기본 탭 (artist → ticket, general → collectbook)
  const defaultTab: Tab = role === "artist" ? "ticket" : "collectbook";
  const [active, setActive] = useState<Tab>(defaultTab);

  // ✅ "잘못된 탭이면 기본 탭으로 복귀"
  // - role 변경 등으로 tabs 목록이 바뀌었는데,
  // - 기존 active가 새 tabs에 없으면 defaultTab으로 되돌림
  useEffect(() => {
    const validKeys = new Set(tabs.map((t) => t.key));
    if (!validKeys.has(active as any)) {
      setActive(defaultTab);
    }
  }, [active, defaultTab, tabs]);

  const Content = useMemo(() => {
    if (role === "artist") {
      if (active === "ticket") return <TicketQr />;
      if (active === "portfolio") return <Portfolio />;
      return <FanLetter />;
    } else {
      if (active === "collectbook") return <CollectBook />;
      if (active === "taste") return <Taste />;
      return <Quiz />;
    }
  }, [active, role]);

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
              className={`loungeTabBtn ${active === t.key ? "isActive" : ""}`}
              onClick={() => setActive(t.key as Tab)}
            >
              <div className="loungeTabTitle">{t.title}</div>
              <div className="loungeTabDesc">{t.desc}</div>
            </button>
          ))}
        </div>

        <section className="loungeBody">{Content}</section>
      </section>
    </main>
  );
}
