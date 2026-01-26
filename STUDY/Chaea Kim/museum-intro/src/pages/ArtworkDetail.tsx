// 임시 디테일페이지 
import React from "react";
import "./ArtworkDetail.css";

export default function ArtworkDetail() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room") ?? "-";
  const side = params.get("side") ?? "-";
  const src = params.get("src") ?? "";

  return (
    <div className="art-detail">
      <div className="art-detail__topbar">
        <button className="art-detail__back" onClick={() => history.back()}>
          ← Back
        </button>
        <div className="art-detail__meta">
          <div>room: {room}</div>
          <div>side: {side}</div>
        </div>
      </div>

      <div className="art-detail__body">
        {src ? <img className="art-detail__img" src={src} alt="artwork" /> : <div>No src</div>}
      </div>

      <div className="art-detail__footer">
        <div className="art-detail__hint">
          임시 디테일 페이지입니다. 나중에 본 프로젝트에 합치면 이 라우트만 교체하면 됨.
        </div>
      </div>
    </div>
  );
}
