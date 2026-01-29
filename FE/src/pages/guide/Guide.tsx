import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./guide.css";

// 스크롤 시 페이드인 애니메이션 훅 (간단 버전)
function useScrollFadeIn() {
  const dom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!dom.current) return;
      const top = dom.current.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      if (top < windowHeight * 0.85) {
        dom.current.classList.add("visible");
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 실행
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return dom;
}

function FlowSection({ role, title, desc, steps, theme }: any) {
  const ref = useScrollFadeIn();

  return (
    <div ref={ref} className={`guide-section ${theme}`}>
      <div className="guide-role-header">
        <span className="role-badge">{role}</span>
        <h2 className="role-title">{title}</h2>
        <p className="role-desc">{desc}</p>
      </div>

      <div className="flow-container">
        {/* 연결선 (배경) */}
        <div className="flow-line-bg">
          <div className="flow-line-progress" />
        </div>

        <div className="flow-steps">
          {steps.map((step: any, idx: number) => (
            <div key={idx} className="flow-step-card">
              <div className="step-number">0{idx + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Guide() {
  const userSteps = [
    { title: "전시 감상", desc: "오프라인 전시회나 온라인 갤러리에서 작품을 감상하세요.", icon: "🖼️" },
    { title: "QR 스캔", desc: "작품 옆의 QR 코드를 스캔하여 작품 상세 페이지로 이동합니다.", icon: "📱" },
    { title: "팬레터 & 소통", desc: "감상을 남기고 작가와 소통하며 나만의 취향을 수집하세요.", icon: "💌" },
  ];

  const artistSteps = [
    { title: "작품 등록", desc: "라운지에서 당신의 작품 포트폴리오를 쉽고 간편하게 등록하세요.", icon: "🎨" },
    { title: "QR 발급", desc: "작품별 고유 QR 코드를 생성하여 전시회에 활용할 수 있습니다.", icon: "🏷️" },
    { title: "반응 확인", desc: "관객들이 남긴 팬레터와 감상평을 실시간으로 확인하세요.", icon: "✨" },
  ];

  return (
    <div className="guide-page">
      {/* Hero Section */}
      <header className="guide-hero">
        <h1 className="guide-hero-title">User Guide</h1>
        <p className="guide-hero-sub">
          예술과 기술이 만나는 곳, <br />
          ARNNECT를 100% 즐기는 방법을 소개합니다.
        </p>
      </header>

      <div className="guide-content">
        {/* 1. User Flow (Silver Theme) */}
        <FlowSection
          role="COLLECTOR"
          title="For Art Lovers"
          desc="숨겨진 예술을 발견하고 수집하는 여정"
          steps={userSteps}
          theme="theme-user"
        />

        {/* 2. Artist Flow (Gold Theme) */}
        <FlowSection
          role="ARTIST"
          title="For Creators"
          desc="당신의 작품을 세상과 연결하는 방법"
          steps={artistSteps}
          theme="theme-artist"
        />
      </div>

      {/* Footer CTA */}
      <div className="guide-cta">
        <p>지금 바로 시작해보세요.</p>
        <div className="cta-buttons">
          <Link to="/signup?type=user" className="cta-btn user">일반 회원가입</Link>
          <Link to="/signup?type=artist" className="cta-btn artist">예술인 회원가입</Link>
        </div>
      </div>
    </div>
  );
}