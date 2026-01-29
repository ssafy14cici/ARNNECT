// FE/src/pages/lounge/user/CollectBookScan.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";
import { NotFoundException } from "@zxing/library";
import "../../lounge.css";
import { addCollectBookItem } from "../../../../utils/collectbookStorage";
import { getExhibitionByCode, redeemTicket } from "../../../../api/tickets";

// TODO(BE 연동):
// - redeemTicket은 의미상 collectbook 도메인이라 api/collectbook.ts로 옮기는 게 깔끔함.
// - 백엔드가 붙으면 "서버에 등록 성공" 후 서버가 준 collect_book_id로 상세 이동하는 흐름이 정석.
//   (지금처럼 localStorage에 addCollectBookItem 하는 건 mock/오프라인 캐시 용도로만 유지)


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

// ✅ JSON / URL / key 변형까지 대응
function extractTicketCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1) JSON: {"ticket_code": "..."} or {"ticketCode": "..."} or {"code": "..."}
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
  } catch {
    // ignore
  }

  // 2) URL: ...?ticket_code=xxx / ticketCode=xxx / code=xxx
  try {
    const url = new URL(trimmed);
    const v =
      url.searchParams.get("ticket_code") ||
      url.searchParams.get("ticketCode") ||
      url.searchParams.get("code");
    if (v) return v.trim();
  } catch {
    // ignore
  }

  // 3) pattern: ticket_code: xxx / ticketCode=xxx / code=xxx
  const m =
    trimmed.match(/ticket[_-]?code\s*[:=]\s*([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/code\s*[:=]\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1].trim();

  // 4) fallback: 그냥 문자열
  return trimmed;
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

function normalizeExhibition(data: unknown): Exhibition | null {
  // TODO(BE 연동 - 이미지):
  // 등록 시 이미지를 "파일 업로드"로 보내더라도,
  // 조회 시에는 FE가 <img src="...">로 그릴 수 있는 값이 필요함.
  // - (권장) BE 응답에 posterUrl/imageUrl(접근 가능한 URL) 제공
  // - 또는 imageId를 주고, GET /files/:id 같은 다운로드 엔드포인트를 제공 → FE에서 URL로 변환 필요

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

  // ✅ 스캔 중 중복 트리거 방지(같은 화면에서 계속 QR 잡힐 때)
  const lockedRef = useRef(false);

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

  // ✅ 전시 조회 실패해도 등록은 가능하도록(티켓코드만 있으면 됨)
  const canRegister = useMemo(() => !!ticketCode && !busy, [ticketCode, busy]);

  useEffect(() => {
    if (step !== "scan") return;

    let isActive = true;
    lockedRef.current = false;

    const codeReader = new BrowserMultiFormatReader();

    const stopCameraFully = () => {
      try {
        controlsRef.current?.stop();
      } catch {
        // ignore
      } finally {
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

      // NotFound는 스캔 중 흔한 케이스라 무시
      if (err && !(err instanceof NotFoundException)) {
        // console.error(err);
      }

      if (!result || lockedRef.current) return;

      const raw = result.getText();
      console.log("[QR raw]", raw);

      const code = extractTicketCode(raw);
      console.log("[parsed code]", code);

      if (!code) {
        setError("QR에서 ticket_code를 읽지 못했습니다.");
        return;
      }

      // ✅ 여기서 잠그고 스캔 중지
      lockedRef.current = true;
      controlsRef.current = controls;
      controls.stop();

      // ✅ 무조건 다음 화면(프리뷰)로 넘어가게
      setError("");
      setTicketCode(code);
      setScannedAt(new Date().toISOString());
      setStep("preview");

      // 전시 조회는 프리뷰에서 로딩 표시로 처리(실패해도 멈춤)
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

        console.log("[scanner started]");
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
      // TODO(BE 연동):
      // redeemTicket(POST /api/v1/collectbook)은 서버에 "티켓북 등록"을 생성하고,
      // 응답으로 collect_book_id를 반환할 가능성이 큼.
      //
      // ✅ 백엔드 연동 후 정석 흐름:
      // const { collect_book_id } = await redeemTicket(...)
      // nav(`/lounge/collectbook/${collect_book_id}`, { replace: true });
      //
      // ✅ 그리고 localStorage 저장(addCollectBookItem)은 선택 사항:
      // - (옵션1) 완전히 제거: 서버 데이터만 사용 (권장)
      // - (옵션2) 낙관적 캐시: 화면 빠르게 보이게 하고, 목록/상세는 서버에서 재조회


      // ✅ 로컬 저장(전시 조회 실패해도 저장은 됨)
      const saved = addCollectBookItem({
        ticketCode,
        exhibition: exhibition ?? {},
        memo: form.memo.trim() || undefined,
        visitedAt: form.visitedAt,
        visibility: form.visibility,
        scannedAt: scannedAt || new Date().toISOString(),
      });

      // ✅ 디테일로 이동
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

              <label>
                <div className="loungeSubHint">공개 설정</div>
                <select
                  value={form.visibility}
                  onChange={(e) => {
                    const v = e.target.value as Visibility;
                    setForm((p) => ({ ...p, visibility: v }));
                  }}
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
