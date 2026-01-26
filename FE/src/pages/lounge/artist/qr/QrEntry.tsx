import { useNavigate } from "react-router-dom";
import "./qr.css";

export default function QrEntry() {
  const nav = useNavigate();

  return (
    <div className="qr-page">
      <header className="qr-head">
        <h1 className="qr-title">QR 발급</h1>
        <p className="qr-sub">우측 하단 카메라 버튼을 눌러 QR 발급 화면으로 이동하세요.</p>
      </header>

      <section className="qr-empty">
        <div className="qr-empty-box">
          <div className="qr-empty-icon">🧾</div>
          <div className="qr-empty-text">
            아직 발급된 QR이 없습니다.
            <br />
            카메라 버튼을 눌러 발급을 시작하세요.
          </div>
        </div>
      </section>

      {/* ✅ 우측 하단 카메라 FAB */}
      <button
        type="button"
        className="qr-fab"
        onClick={() => nav("/lounge/qr/issue")}
        aria-label="QR 발급 화면으로 이동"
      >
        <span className="qr-fab-icon">📷</span>
      </button>
    </div>
  );
}
