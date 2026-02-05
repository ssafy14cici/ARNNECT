import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { NotFoundException } from "@zxing/library";
import "../../lounge.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiTicketScan } from "../../../../features/collectbook/api/real";

type Step = "scan" | "preview";

function extractTicketCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as any;
    const v = parsed?.ticket_code || parsed?.ticketCode || parsed?.code;
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {}

  try {
    const url = new URL(trimmed);
    const v = url.searchParams.get("ticket") || url.searchParams.get("ticket_code") || url.searchParams.get("ticketCode");
    if (v) return v.trim();
  } catch {}

  return trimmed;
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

export default function CollectBookScan() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lockedRef = useRef(false);

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const canRegister = useMemo(() => !!ticketCode && !!ownerUuid && !busy, [ticketCode, ownerUuid, busy]);

  useEffect(() => {
    if (step !== "scan") return;

    let alive = true;
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
      if (stream instanceof MediaStream) stream.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };

    const onDecode = async (result: Result | undefined, err: unknown, controls: IScannerControls) => {
      if (!alive) return;
      if (err && !(err instanceof NotFoundException)) {}

      if (!result || lockedRef.current) return;

      const code = extractTicketCode(result.getText());
      if (!code) {
        setError("QR에서 ticketCode를 읽지 못했습니다.");
        return;
      }

      lockedRef.current = true;
      controlsRef.current = controls;
      controls.stop();

      setError("");
      setTicketCode(code);
      setStep("preview");
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
        if (!alive) return;
        setError(getErrorMessage(e, "카메라 접근 실패(HTTPS/권한 확인 필요)"));
      }
    })();

    return () => {
      alive = false;
      setScannerReady(false);
      stopCameraFully();
    };
  }, [step]);

  const reset = () => {
    setError("");
    setTicketCode("");
    setBusy(false);
    lockedRef.current = false;
    setStep("scan");
  };

  const register = async () => {
    if (!isLoggedIn || !ownerUuid) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (!canRegister) return;

    setBusy(true);
    setError("");

    try {
      await apiTicketScan(ticketCode);

      // ✅ userTicketId 같은 게 없으니 “ticketCode로 상세”로 이동
      nav(`/lounge/collectbook/${encodeURIComponent(ticketCode)}`, { replace: true });
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
            <h2 className="loungeSubPanelTitle">티켓 확인</h2>

            <p className="loungeSubHint">
              <strong>ticketCode</strong>: {ticketCode}
            </p>

            {error && <div className="loungeNotice">{error}</div>}

            <div className="loungeSubActions">
              <button className="loungeSubBtn" type="button" onClick={reset} disabled={busy}>
                다시 스캔
              </button>
              <button className="loungeSubBtn" type="button" onClick={register} disabled={!canRegister}>
                {busy ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
