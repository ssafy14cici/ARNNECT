import React from "react";
import "../styles/home.css";

export default function AboutSection() {
  return (
    <section id="about" className="section">
      <div className="aboutWrap">
        <h2 className="koreanLine">
          숨겨진 예술가를 발굴하고,
          <br />
          당신의 취향을 완성하세요
        </h2>

        <button
          className="ctaBtn"
          type="button"
          onClick={() => {
            // 나중에 온보딩/갤러리 섹션으로 연결
            document.querySelector("#gallery")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Start →
        </button>
      </div>

      <div style={{ maxWidth: 980, margin: "26px auto 0", color: "var(--muted)", lineHeight: 1.7, fontSize: 14 }}>
        작품을 ‘수집’하기 전에, 당신의 취향을 먼저 설계합니다. 추천, 저장, 큐레이션 피드까지 메인 경험을 여기서 확장하세요.
      </div>
    </section>
  );
}
