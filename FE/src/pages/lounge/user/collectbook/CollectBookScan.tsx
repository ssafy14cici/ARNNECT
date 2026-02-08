// FE/src/pages/lounge/user/collectbook/CollectBookScan.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { NotFoundException } from "@zxing/library";
import "../../lounge.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiTicketScan, apiCollectBookList } from "../../../../features/collectbook/api/real";
import type { CollectBookResponse } from "../../../../features/tickets/api/realTickets";

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

// ✅ KST 기준 YYYY-MM-DD
function ymdKstFromIso(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // "2026-02-08"
}

function todayYmdKst() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function pickLatestForCode(list: CollectBookResponse[], code: string) {
  const items = list.filter((x) => x.ticketCode === code);
  items.sort((a, b) => {
    const ta = new Date((a as any)?.createdAt ?? 0).getTime();
    const tb = new Date((b as any)?.createdAt ?? 0).getTime();
    return tb - ta;
  });
  return items[0] ?? null;
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

  // ✅ 오늘 이미 같은 QR을 등록했는지
  const [duplicateToday, setDuplicateToday] = useState(false);

  const canRegister = useMemo(
    () => !!ticketCode && !!ownerUuid && !busy && !duplicateToday,
    [ticketCode, ownerUuid, busy, duplicateToday],
  );

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

  // ✅ preview에 들어오면 “오늘 동일 ticketCode 등록 여부” 미리 계산
  useEffect(() => {
    if (step !== "preview") return;
    if (!isLoggedIn || !ownerUuid || !ticketCode) {
      setDuplicateToday(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const list = await apiCollectBookList(ownerUuid);
        if (!alive) return;

        const today = todayYmdKst();
        const exists = Array.isArray(list)
          ? list.some((x) => x.ticketCode === ticketCode && ymdKstFromIso((x as any)?.createdAt) === today)
          : false;

        setDuplicateToday(exists);
        if (exists) setError("같은 QR은 하루에 한 번만 등록 가능합니다.");
      } catch {
        // 리스트 조회 실패는 등록을 막을지 말지 정책인데,
        // 여기서는 UX 상 '버튼은 열어두고' register에서 재검증하는 형태로 둠
        if (!alive) return;
        setDuplicateToday(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [step, ticketCode, isLoggedIn, ownerUuid]);

  const reset = () => {
    setError("");
    setTicketCode("");
    setBusy(false);
    setDuplicateToday(false);
    lockedRef.current = false;
    setStep("scan");
  };

  const register = async () => {
    if (!isLoggedIn || !ownerUuid) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (!ticketCode) return;

    setBusy(true);
    setError("");

    try {
      // ✅ 최종 재검증(레이스 방지)
      const listBefore = await apiCollectBookList(ownerUuid);
      const today = todayYmdKst();
      const existsToday = Array.isArray(listBefore)
        ? listBefore.some((x) => x.ticketCode === ticketCode && ymdKstFromIso((x as any)?.createdAt) === today)
        : false;

      if (existsToday) {
        setDuplicateToday(true);
        setError("같은 QR은 하루에 한 번만 등록 가능합니다.");
        return;
      }

      await apiTicketScan(ticketCode);

      // ✅ 등록 직후 최신 레코드 찾고, 그 createdAt으로 상세 고정
      const listAfter = await apiCollectBookList(ownerUuid);
      const latest = Array.isArray(listAfter) ? pickLatestForCode(listAfter, ticketCode) : null;
      const at = latest && (latest as any)?.createdAt ? encodeURIComponent(String((latest as any).createdAt)) : "";

      const url = `/lounge/collectbook/${encodeURIComponent(ticketCode)}${at ? `?at=${at}` : ""}`;
      nav(url, { replace: true });
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

            {duplicateToday && (
              <div className="loungeNotice">같은 QR은 하루에 한 번만 등록 가능합니다.</div>
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
