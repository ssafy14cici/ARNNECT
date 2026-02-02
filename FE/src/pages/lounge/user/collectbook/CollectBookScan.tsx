// FE/src/pages/lounge/user/collectbook/CollectBookScan.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { NotFoundException } from "@zxing/library";
import "../../lounge.css";
import { addCollectBookItem } from "../../../../features/collectbook/storage";
import { getExhibitionByCode, redeemTicket } from "../../../../features/tickets/api";
import { useAuthStore } from "../../../../features/auth/store"; // ✅ 추가

type Step = "scan" | "preview";
type Visibility = "private" | "public";

type Exhibition = {
  title?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  posterUrl?: string;
};

type FormState = {
  memo: string;
  visitedAt: string;
  visibility: Visibility;
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function extractTicketCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const v =
        (typeof obj.ticket_code === "string" && obj.ticket_code) ||
        (typeof obj.ticketCode === "string" && obj.ticketCode) ||
        (typeof obj.code === "string" && obj.code);
      if (v) return v.trim();
    }
  } catch {}

  try {
    const url = new URL(trimmed);
    const v =
      url.searchParams.get("ticket_code") ||
      url.searchParams.get("ticketCode") ||
      url.searchParams.get("code");
    if (v) return v.trim();
  } catch {}

  const m =
    trimmed.match(/ticket[_-]?code\s*[:=]\s*([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/code\s*[:=]\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1].trim();

  return trimmed;
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

function normalizeExhibition(data: unknown): Exhibition | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  const pickStr = (v: unknown) => (typeof v === "string" ? v : undefined);

  return {
    title: pickStr(obj.title),
    place: pickStr(obj.place),
    startDate: pickStr(obj.startDate) ?? pickStr(obj.start_date) ?? pickStr(obj.start),
    endDate: pickStr(obj.endDate) ?? pickStr(obj.end_date) ?? pickStr(obj.end),
    posterUrl: pickStr(obj.posterUrl) ?? pickStr(obj.poster_url),
  };
}

export default function CollectBookScan() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockedRef = useRef(false);

  // ✅ 로그인 유저 UUID (ownerUuid로 저장)
  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");

  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState("");

  const [ticketCode, setTicketCode] = useState("");
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [scannedAt, setScannedAt] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    memo: "",
    visitedAt: todayYYYYMMDD(),
    visibility: "private",
  });

  const [busy, setBusy] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [loadingExhibition, setLoadingExhibition] = useState(false);

  // ✅ ownerUuid까지 있어야 로컬 저장 가능
  const canRegister = useMemo(() => !!ticketCode && !!ownerUuid && !busy, [ticketCode, ownerUuid, busy]);

  useEffect(() => {
    if (step !== "scan") return;

    let isActive = true;
    lockedRef.current = false;

    const codeReader = new BrowserMultiFormatReader();

    const stopCameraFully = () => {
      try {
        controlsRef.current?.stop();
      } catch {} finally {
        controlsRef.current = null;
      }

      const videoEl = videoRef.current;
      const stream = videoEl?.srcObject;

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoEl) videoEl.srcObject = null;
    };

    const onDecode = async (result: Result | undefined, err: unknown, controls: IScannerControls) => {
      if (!isActive) return;
      if (err && !(err instanceof NotFoundException)) {}

      if (!result || lockedRef.current) return;

      const raw = result.getText();
      const code = extractTicketCode(raw);

      if (!code) {
        setError("QR에서 ticket_code를 읽지 못했습니다.");
        return;
      }

      lockedRef.current = true;
      controlsRef.current = controls;
      controls.stop();

      setError("");
      setTicketCode(code);
      setScannedAt(new Date().toISOString());
      setStep("preview");

      setLoadingExhibition(true);
      try {
        const data = (await getExhibitionByCode(code)) as unknown;
        const ex = normalizeExhibition(data) ?? (data as Exhibition);
        if (!isActive) return;
        setExhibition(ex);
      } catch (e: unknown) {
        if (!isActive) return;
        setExhibition(null);
        setError(getErrorMessage(e, "전시 정보를 불러오지 못했습니다. (그래도 티켓 등록은 가능합니다)"));
      } finally {
        if (isActive) setLoadingExhibition(false);
      }
    };

    (async () => {
      setError("");
      setScannerReady(false);
      try {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const controls = await codeReader.decodeFromVideoDevice(undefined, videoEl, onDecode);
        controlsRef.current = controls;

        setScannerReady(true);
      } catch (e: unknown) {
        if (!isActive) return;
        setError(getErrorMessage(e, "카메라 접근 실패(HTTPS/권한 확인 필요)"));
      }
    })();

    return () => {
      isActive = false;
      setScannerReady(false);
      stopCameraFully();
    };
  }, [step]);

  const reset = () => {
    setError("");
    setTicketCode("");
    setExhibition(null);
    setScannedAt("");
    setForm({ memo: "", visitedAt: todayYYYYMMDD(), visibility: "private" });
    setBusy(false);
    setLoadingExhibition(false);
    lockedRef.current = false;
    setStep("scan");
  };

  const register = async () => {
    if (!ownerUuid) {
      setError("로그인이 필요합니다.");
      return;
    }
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

      // ✅ 로컬 저장 (ownerUuid 필수 포함)
      const saved = addCollectBookItem({
        ownerUuid, // ✅ 추가 (TS 에러 해결)
        ticketCode,
        exhibition: exhibition ?? {},
        memo: form.memo.trim() || undefined,
        visitedAt: form.visitedAt,
        visibility: form.visibility,
        scannedAt: scannedAt || new Date().toISOString(),
      });

      nav(`/lounge/collectbook/${saved.id}`, { replace: true });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "등록 실패"));
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

            {scannerReady && (
              <div className="loungeSubHint" style={{ marginTop: 8 }}>
                카메라 연결됨 (스캔 중)
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <video
                ref={videoRef}
                playsInline
                muted
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
              <strong>ticket_code</strong>: {ticketCode}
              <br />
              {loadingExhibition ? (
                <>
                  <strong>전시</strong>: 불러오는 중...
                </>
              ) : (
                <>
                  <strong>전시</strong>: {exhibition?.title ?? "-"}
                  <br />
                  <strong>장소</strong>: {exhibition?.place ?? "-"}
                  <br />
                  <strong>기간</strong>: {exhibition?.startDate ?? "-"} ~ {exhibition?.endDate ?? "-"}
                </>
              )}
            </p>

            {!loadingExhibition && exhibition?.posterUrl && (
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

              {/* ✅ 공개/비공개 선택: 토글 UI로 확실히 보이게 */}
              <div>
                <div className="loungeSubHint">공개 설정</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, visibility: "private" }))}
                    style={segBtnStyle(form.visibility === "private")}
                  >
                    비공개
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, visibility: "public" }))}
                    style={segBtnStyle(form.visibility === "public")}
                  >
                    공개
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="loungeNotice">{error}</div>}

            <div className="loungeSubActions">
              <button className="loungeSubBtn" type="button" onClick={reset} disabled={busy}>
                다시 스캔
              </button>
              <button className="loungeSubBtn" type="button" onClick={register} disabled={!canRegister}>
                {busy ? "등록 중..." : "티켓 등록 후 디테일로"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

const segBtnStyle = (active: boolean): CSSProperties => ({
  width: "100%",
  borderRadius: 12,
  padding: "10px 12px",
  border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.14)",
  background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
  color: "inherit",
  fontWeight: 700,
});
