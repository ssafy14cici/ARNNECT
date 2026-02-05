// FE/src/pages/lounge/user/collectbook/CollectBookScan.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { NotFoundException } from "@zxing/library";
import "../../lounge.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiTicketScan, apiCollectBookList } from "../../../../features/collectbook/api/real";
import { getTicketByCode , type TicketInfoResponse } from "../../../../features/tickets/api/realTickets";
import { resolveTicketMedia } from "../../../../features/tickets/resolveTicketMedia";

type Step = "scan" | "preview";

function extractTicketCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1) JSON
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

  // 2) URL query
  try {
    const url = new URL(trimmed);
    const v =
      url.searchParams.get("ticket_code") ||
      url.searchParams.get("ticketCode") ||
      url.searchParams.get("code");
    if (v) return v.trim();
  } catch {}

  // 3) key=value pattern
  const m =
    trimmed.match(/ticket[_-]?code\s*[:=]\s*([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/code\s*[:=]\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1].trim();

  // 4) raw itself
  return trimmed;
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : "-");

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
  const [ticketInfo, setTicketInfo] = useState<TicketInfoResponse | null>(null);

  const [busy, setBusy] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);

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

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoEl) videoEl.srcObject = null;
    };

    const onDecode = async (result: Result | undefined, err: unknown, controls: IScannerControls) => {
      if (!alive) return;
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
      setStep("preview");

      // ✅ 미리보기: 티켓코드로 티켓 정보 조회
      setLoadingTicket(true);
      try {
        const info = await getTicketByCode (code);
        if (!alive) return;
        setTicketInfo(info);
      } catch (e: unknown) {
        if (!alive) return;
        setTicketInfo(null);
        setError(getErrorMessage(e, "티켓 정보를 불러오지 못했습니다. (등록은 시도할 수 있습니다)"));
      } finally {
        if (alive) setLoadingTicket(false);
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
    setTicketInfo(null);
    setBusy(false);
    setLoadingTicket(false);
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
      // ✅ 서버 등록
      const scanRes = await apiTicketScan(ticketCode);

      // 1) scanRes가 ticketId를 직접 주는 경우 우선 처리
      const directTicketId =
        scanRes && typeof scanRes === "object" && "ticketId" in scanRes ? Number((scanRes as any).ticketId) : NaN;

      if (Number.isFinite(directTicketId)) {
        nav(`/lounge/collectbook/${directTicketId}`, { replace: true });
        return;
      }

      // 2) 아니면 리스트에서 코드 매칭해서 상세로 이동
      const list = await apiCollectBookList(ownerUuid);
      const found = Array.isArray(list) ? list.find((x) => x.ticketCode === ticketCode) : undefined;

      if (found?.ticketId) {
        nav(`/lounge/collectbook/${found.ticketId}`, { replace: true });
        return;
      }

      // 3) 최후: 리스트로
      nav(`/lounge/collectbook`, { replace: true });
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
              <br />
              {loadingTicket ? (
                <>티켓 정보 불러오는 중...</>
              ) : ticketInfo ? (
                <>
                  <strong>제목</strong>: {ticketInfo.title}
                  <br />
                  <strong>장소</strong>: {ticketInfo.address} {ticketInfo.addressDetail ? `(${ticketInfo.addressDetail})` : ""}
                  <br />
                  <strong>기간</strong>: {ticketInfo.startDate} ~ {ticketInfo.endDate}
                  <br />
                  <strong>시간</strong>: {hhmm(ticketInfo.startTime)} ~ {hhmm(ticketInfo.endTime)}
                </>
              ) : (
                <>티켓 정보를 못 가져왔습니다. (등록은 시도 가능)</>
              )}
            </p>

            {!loadingTicket && ticketInfo?.ticketImageName && (
              <img
                src={resolveTicketMedia(ticketInfo.ticketImageName)}
                alt="ticket"
                style={{
                  width: "100%",
                  maxWidth: 520,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "block",
                  marginTop: 12,
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}

            {!loadingTicket && ticketInfo?.qrImageName && (
              <div style={{ marginTop: 12, background: "#fff", padding: 12, borderRadius: 12, display: "inline-block" }}>
                <img
                  src={resolveTicketMedia(ticketInfo.qrImageName)}
                  alt="qr"
                  style={{ width: 220, height: 220 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

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
