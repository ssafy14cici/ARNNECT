import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "../lounge.css";

import { getExhibitionByCode, redeemTicket } from "../../../api/tickets";

type Step = "scan" | "preview" | "done";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function extractTicketCode(raw: string): string | null {
  // JSON 형태 지원: {"ticket_code":"..."}
  try {
    const obj = JSON.parse(raw);
    if (obj?.ticket_code && typeof obj.ticket_code === "string") return obj.ticket_code;
  } catch {
    // ignore
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export default function CollectBookScan() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState("");

  const [ticketCode, setTicketCode] = useState("");
  const [exhibition, setExhibition] = useState<any>(null);

  const [form, setForm] = useState({
    memo: "",
    visitedAt: todayYYYYMMDD(),
    visibility: "private" as "private" | "public",
  });

  const [busy, setBusy] = useState(false);

  const canRegister = useMemo(() => !!ticketCode && !!exhibition && !busy, [ticketCode, exhibition, busy]);

  // ✅ 스캔은 "읽기"만 하고, 생성은 절대 하지 않음.
  useEffect(() => {
    if (step !== "scan") return;

    const codeReader = new BrowserMultiFormatReader();
    let locked = false;

    (async () => {
      setError("");
      try {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        await codeReader.decodeFromVideoDevice(undefined, videoEl, async (result) => {
          if (!result || locked) return;

          const raw = result.getText();
          const code = extractTicketCode(raw);
          if (!code) {
            setError("QR에서 ticket_code를 읽지 못했습니다.");
            return;
          }

          locked = true;
          codeReader.reset();

          setTicketCode(code);

          try {
            setBusy(true);
            const data = await getExhibitionByCode(code);
            setExhibition(data);
            setStep("preview");
          } catch (e: any) {
            setError(e?.message ?? "전시 정보를 불러오지 못했습니다.");
            locked = false;
            setTicketCode("");
            setStep("scan");
          } finally {
            setBusy(false);
          }
        });
      } catch (e: any) {
        setError(e?.message ?? "카메라 접근 실패(HTTPS/권한 확인 필요)");
      }
    })();

    return () => {
      codeReader.reset();
    };
  }, [step]);

  const reset = () => {
    setError("");
    setTicketCode("");
    setExhibition(null);
    setForm({ memo: "", visitedAt: todayYYYYMMDD(), visibility: "private" });
    setStep("scan");
  };

  const register = async () => {
    if (!canRegister) return;

    setBusy(true);
    setError("");

    try {
      await redeemTicket({
        ticket_code: ticketCode,
        memo: form.memo.trim() || undefined,
        visitedAt: form.visitedAt,
        visibility: form.visibility,
      });

      setStep("done");
      setTimeout(() => nav("/lounge/collectbook", { replace: true }), 600);
    } catch (e: any) {
      setError(e?.message ?? "등록 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">티켓 스캔</h1>
          <Link className="loungeBackLink" to="/lounge/collectbook">
            ← 컬렉트북으로
          </Link>
        </div>

        {step === "scan" && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">QR을 스캔하세요</h2>
            <p className="loungeSubHint">
              스캔 단계에서는 코드를 생성하지 않고, QR에서 <strong>ticket_code를 읽기만</strong> 합니다.
            </p>

            <div style={{ marginTop: 12 }}>
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  maxWidth: 520,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />
            </div>

            {error && <div className="loungeNotice">{error}</div>}
          </div>
        )}

        {step === "preview" && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">전시 정보 확인</h2>

            <p className="loungeSubHint">
              <strong>전시</strong>: {exhibition?.title ?? "-"}
              <br />
              <strong>장소</strong>: {exhibition?.place ?? "-"}
              <br />
              <strong>기간</strong>: {exhibition?.startDate ?? "-"} ~ {exhibition?.endDate ?? "-"}
              <br />
              <strong>ticket_code</strong>: {ticketCode}
            </p>

            {exhibition?.posterUrl && (
              <div style={{ marginTop: 12 }}>
                <img
                  src={exhibition.posterUrl}
                  alt="poster"
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                />
              </div>
            )}

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label>
                <div className="loungeSubHint">메모(선택)</div>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                  rows={3}
                  style={textareaStyle}
                />
              </label>

              <label>
                <div className="loungeSubHint">관람일</div>
                <input
                  type="date"
                  value={form.visitedAt}
                  onChange={(e) => setForm((p) => ({ ...p, visitedAt: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label>
                <div className="loungeSubHint">공개 설정</div>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as any }))}
                  style={inputStyle}
                >
                  <option value="private">비공개</option>
                  <option value="public">공개</option>
                </select>
              </label>
            </div>

            {error && <div className="loungeNotice">{error}</div>}

            <div className="loungeSubActions">
              <button className="loungeSubBtn" type="button" onClick={reset} disabled={busy}>
                다시 스캔
              </button>
              <button className="loungeSubBtn" type="button" onClick={register} disabled={!canRegister}>
                {busy ? "등록 중..." : "티켓 등록"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">등록 완료</h2>
            <p className="loungeSubHint">티켓북에 추가되었습니다.</p>
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
