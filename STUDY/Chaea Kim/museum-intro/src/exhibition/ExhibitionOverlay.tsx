// src/exhibition/ExhibitionOverlay.tsx
import React from "react";
import "./css/landing.css";

type Props = {
  onEnter?: () => void;
};

export default function ExhibitionOverlay({ onEnter }: Props) {
  return (
    <div className="landing">
      {/* Top */}
      <header className="landing__top">
        <div className="landing__brand">
          <div className="title">ARNNECT</div>
          <div className="sub">FONDI</div>
        </div>

        <div className="landing__menu">
          <span>MENU</span>
          <span className="landing__hamburger" aria-hidden="true" />
        </div>
      </header>

      {/* Hero */}
      <section className="landing__hero">
        <h1>
          LIFE AND PERSONALITY
          <br />
          OF ARNNECT
        </h1>

        <div className="desc">
          Interactive museum
          <br />
          statesman and writer
        </div>

        <div className="landing__enterWrap">
          <button
            className="landing__enter"
            type="button"
            onClick={() => onEnter?.()}
          >
            Enter
            <br />
            the museum
          </button>
        </div>
      </section>

      {/* Stage */}
      <section className="landing__stage">
        <div className="landing__horizon" />
        <div className="landing__water" />

        {/* ✅ Three.js가 이 캔버스에 렌더링 */}
        <canvas id="canvas" />

        {/* ✅ 반사 느낌은 CSS로 처리 (A안) */}
        <div className="landing__reflection" />
      </section>
    </div>
  );
}
