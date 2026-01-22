// FE/src/pages/lounge/artist/TicketQr.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import "../lounge.css";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeTicketCode() {
  // 브라우저 지원: 대부분 OK. 미지원이면 fallback 사용
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `EXH_${crypto.randomUUID()}`;
  }
  return `EXH_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function TicketQr() {
  const [ticketCode, setTicketCode] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    place: "",
    startDate: todayYYYYMMDD(),
    endDate: todayYYYYMMDD(),
    posterUrl: "",
    description: "",
  });

  const canIssue = useMemo(() => {
    return form.title.trim().length > 0 && form.place.trim().length > 0;
  }, [form.title, form.place]);

  // ✅ QR에 들어갈 값: ticket_code만
  // JSON으로 싸도 되고, 문자열만 넣어도 됩니다.
  const qrValue = useMemo(() => {
    if (!ticketCode) return "";
    return JSON.stringify({ v: 1, ticket_code: ticketCode });
  }, [ticketCode]);

  const issueMock = () => {
    // ✅ 백엔드 없이 "발급된 것처럼" ticket_code 생성
    const code = makeTicketCode();
    setTicketCode(code);
  };

  const reset = () => {
    setTicketCode("");
  };

  const copy = async () => {
    if (!ticketCode) return;
    try {
      await navigator.clipboard.writeText(ticketCode);
    } catch {
      // ignore
    }
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 발급 (Mock)</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">
          백엔드 없이 QR 렌더링만 확인하는 화면입니다. 전시 정보를 입력하고 “QR 발급”을 누르면
          프론트에서 임시 <strong>ticket_code</strong>를 생성해서 QR을 표시합니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">전시 정보</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div className="loungeSubHint">전시 제목 *</div>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="예: 2026 WINTER EXHIBITION"
                style={inputStyle}
              />
            </label>

            <label>
              <div className="loungeSubHint">장소 *</div>
              <input
                value={form.place}
                onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
                placeholder="예: ARNNECT Gallery, Seoul"
                style={inputStyle}
              />
            </label>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <div className="loungeSubHint">시작일</div>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label>
                <div className="loungeSubHint">종료일</div>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  style={inputStyle}
                />
              </label>
            </div>

            <label>
              <div className="loungeSubHint">포스터 URL (선택)</div>
              <input
                value={form.posterUrl}
                onChange={(e) => setForm((p) => ({ ...p, posterUrl: e.target.value }))}
                placeholder="https://..."
                style={inputStyle}
              />
            </label>

            <label>
              <div className="loungeSubHint">설명 (선택)</div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                style={textareaStyle}
              />
            </label>
          </div>

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button" onClick={issueMock} disabled={!canIssue}>
              QR 발급(내부 생성)
            </button>

            <button className="loungeSubBtn" type="button" onClick={reset} disabled={!ticketCode}>
              초기화
            </button>

            <button className="loungeSubBtn" type="button" onClick={copy} disabled={!ticketCode}>
              ticket_code 복사
            </button>
          </div>
        </div>

        {ticketCode && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">발급 결과</h2>

            <p className="loungeSubHint">
              <strong>ticket_code</strong>: {ticketCode}
              <br />
              <strong>QR payload</strong>: {qrValue}
            </p>

            <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
                <QRCode value={qrValue} size={220} />
              </div>

              <div className="loungeSubHint" style={{ maxWidth: 420 }}>
                지금은 “QR이 생성/표시되는지”만 확인하는 단계입니다.
                나중에 백엔드가 붙으면, 이 ticket_code를 서버가 발급한 값으로 교체하면 됩니다.
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};
