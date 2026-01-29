// FE/src/pages/lounge/artist/TicketQr.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import "../lounge.css";

import {
  createExhibitionTicket,
  deleteExhibitionByCode,
  listIssuedExhibitions,
  updateExhibitionByCode,
} from "../../../api/tickets";

/**
 * 스키마(조회 Response) 기준:
 * - memberUuid: string
 * - address: string
 * - addressDetail: string
 * - title: string
 * - startDate: string(date)
 * - endDate: string(date)
 * - startTime: string ("HH:mm")
 * - endTime: string ("HH:mm")
 * - ticketCode: string
 * - image: string (url or base64)  // 조회용
 *
 * ✅ 유저 요구사항:
 * - image는 URL이 아니라 base64로 백엔드로 바로 보냄(= 업로드)
 *   → 발급 후 ticketCode를 받은 뒤, FE에서 QR SVG를 base64로 만들어 update로 업로드(옵션)
 */

// -----------------------
// helpers
// -----------------------
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isHHmm(v: string) {
  // 00:00 ~ 23:59
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

// 유니코드 안전 base64
function base64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// react-qr-code가 렌더한 SVG를 data url로 변환
function svgToDataUrl(svgEl: SVGElement) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = base64EncodeUnicode(xml);
  return `data:image/svg+xml;base64,${svg64}`;
}

// 백엔드가 base64만 주거나(data prefix 없음) data url / url을 줄 수도 있어서 normalize
function normalizeImageToSrc(image?: string | null) {
  if (!image) return "";
  // 이미 data url이면 그대로
  if (image.startsWith("data:image/")) return image;
  // url이면 그대로
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  // base64만 온 경우(보통 png로 가정). 백엔드가 svg base64를 주면 여기 mime만 바꾸면 됨.
  return `data:image/png;base64,${image}`;
}

// API 응답에서 ticketCode 키가 ticket_code / ticketCode 혼재할 수 있으니 흡수
function pickTicketCode(obj: any): string {
  return obj?.ticketCode ?? obj?.ticket_code ?? obj?.ticketCode?.toString?.() ?? "";
}

type TicketItem = {
  memberUuid?: string;
  address: string;
  addressDetail: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  ticketCode: string;
  image?: string; // base64 or url or data url
};

type FormState = {
  title: string;
  address: string;
  addressDetail: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

function toForm(t?: Partial<TicketItem> | null): FormState {
  return {
    title: t?.title ?? "",
    address: t?.address ?? "",
    addressDetail: t?.addressDetail ?? "",
    startDate: t?.startDate ?? todayYYYYMMDD(),
    endDate: t?.endDate ?? todayYYYYMMDD(),
    startTime: t?.startTime ?? "10:00",
    endTime: t?.endTime ?? "20:00",
  };
}

export default function TicketQr() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 현재 선택된 티켓 코드 & 이미지(조회용)
  const [ticketCode, setTicketCode] = useState<string>("");
  const [qrImageSrc, setQrImageSrc] = useState<string>("");

  // ✅ 수정 모드: 기존 ticketCode 유지하고 내용만 수정
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => toForm(null));

  // 발급 목록
  const [issued, setIssued] = useState<TicketItem[]>([]);
  const [showIssued, setShowIssued] = useState(false);

  // QR 렌더 DOM 접근(= SVG를 base64로 만들어 백엔드에 보낼 때 사용)
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  // ---- 설정: “발급 후 QR 이미지를 base64로 백엔드에 업로드”를 자동으로 할지
  const AUTO_UPLOAD_QR_IMAGE = true;

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!form.title.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.startDate || !form.endDate) return false;
    if (!isHHmm(form.startTime) || !isHHmm(form.endTime)) return false;
    return true;
  }, [form, busy]);

  // 스캔 payload(기존 로직 유지)
  const qrValue = useMemo(() => {
    if (!ticketCode) return "";
    return JSON.stringify({ v: 1, ticket_code: ticketCode });
  }, [ticketCode]);

  const normalizeList = (raw: unknown): TicketItem[] => {
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((x: any) => {
        const code = pickTicketCode(x);
        if (!code) return null;

        return {
          memberUuid: x?.memberUuid ?? x?.member_uuid,
          address: x?.address ?? "",
          addressDetail: x?.addressDetail ?? x?.address_detail ?? "",
          title: x?.title ?? "",
          startDate: x?.startDate ?? "",
          endDate: x?.endDate ?? "",
          startTime: x?.startTime ?? "",
          endTime: x?.endTime ?? "",
          ticketCode: code,
          image: x?.image,
        } satisfies TicketItem;
      })
      .filter(Boolean) as TicketItem[];
  };

  const reloadIssued = async () => {
    try {
      const list = await listIssuedExhibitions();
      setIssued(normalizeList(list as unknown));
    } catch {
      // 목록 실패는 치명적이지 않아서 조용히
    }
  };

  useEffect(() => {
    reloadIssued();
  }, []);

  const submit = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setError("");

    try {
      const payload = {
        // ✅ Request에는 image 넣지 않음(조회용 필드)
        title: form.title.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
      };

      if (editingCode) {
        // ✅ ticketCode 고정, 내용만 수정
        await updateExhibitionByCode(editingCode, payload);
        setTicketCode(editingCode);
      } else {
        // ✅ 신규 발급
        const res: any = await createExhibitionTicket(payload);
        const code = pickTicketCode(res);
        setTicketCode(code);

        // ✅ 백엔드가 image를 같이 내려주면 그대로 사용(권장 A)
        const img = res?.image ? normalizeImageToSrc(res.image) : "";
        setQrImageSrc(img);
      }

      await reloadIssued();
      setShowIssued(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setError("");
    setBusy(false);
    setEditingCode(null);
    setTicketCode("");
    setQrImageSrc("");
    setForm(toForm(null));
  };

  const copy = async () => {
    if (!ticketCode) return;
    try {
      await navigator.clipboard.writeText(ticketCode);
    } catch {
      // ignore
    }
  };

  const startEdit = (t: TicketItem) => {
    setError("");
    setEditingCode(t.ticketCode);
    setTicketCode(t.ticketCode);
    setQrImageSrc(normalizeImageToSrc(t.image));
    setForm(toForm(t));
    setShowIssued(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (code: string) => {
    const ok = confirm("이 발급 기록을 삭제할까요?");
    if (!ok) return;

    setBusy(true);
    setError("");
    try {
      await deleteExhibitionByCode(code);
      if (ticketCode === code) {
        setTicketCode("");
        setQrImageSrc("");
      }
      if (editingCode === code) setEditingCode(null);
      await reloadIssued();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  /**
   * ✅ 대안 B: “URL이 아니라 백엔드로 바로” (base64 업로드)
   * - ticketCode가 생긴 뒤 QR SVG를 base64(data url)로 만들고
   * - 백엔드에 저장(업데이트)한다.
   *
   * ⚠️ 전제: updateExhibitionByCode가 `image` 필드를 받을 수 있어야 함
   *    (아니면 /tickets/{code}/image 같은 전용 업로드 API를 따로 만들고 여기서 호출)
   */
  useEffect(() => {
    if (!AUTO_UPLOAD_QR_IMAGE) return;
    if (!ticketCode) return;
    if (busy) return;

    // 이미 백엔드에서 받은 image가 있으면 업로드할 필요 없음
    if (qrImageSrc) return;

    (async () => {
      // QRCode가 DOM에 렌더된 다음 프레임에 svg를 읽음
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const wrap = qrWrapRef.current;
      const svg = wrap?.querySelector("svg");
      if (!svg) return;

      const dataUrl = svgToDataUrl(svg);
      setQrImageSrc(dataUrl);

      // 백엔드에는 base64만 보내고 싶으면 dataUrl의 ',' 뒤만 사용
      const base64Only = dataUrl.split(",")[1] ?? "";

      try {
        // ✅ 여기 key 이름(image / qrImage 등)은 백엔드 스펙에 맞춰야 함
        await updateExhibitionByCode(ticketCode, { image: base64Only } as any);
        await reloadIssued();
      } catch {
        // 업로드 실패는 화면 동작을 막지 않음(일단 QR은 FE에서 표시됨)
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCode, busy, qrImageSrc]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 발급</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">
          QR payload는 <strong>ticketCode</strong>만 포함합니다.
          <br />
          <strong>image(QR 이미지)</strong>는 조회용이며, URL 대신 base64로 백엔드에 저장할 수 있습니다.
        </p>

        <div className="loungeSubPanel">
          <h2 className="loungeSubPanelTitle">
            전시 정보 {editingCode ? <span style={{ opacity: 0.7 }}>(수정: {editingCode})</span> : null}
          </h2>

          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div className="loungeSubHint">전시 제목 *</div>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="예: 원형하는 몸: Being Being Being"
                style={inputStyle}
                disabled={busy}
              />
            </label>

            <label>
              <div className="loungeSubHint">주소 *</div>
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="예: 서울시 ..."
                style={inputStyle}
                disabled={busy}
              />
            </label>

            <label>
              <div className="loungeSubHint">상세주소 (선택)</div>
              <input
                value={form.addressDetail}
                onChange={(e) => setForm((p) => ({ ...p, addressDetail: e.target.value }))}
                placeholder="예: 101동 ..."
                style={inputStyle}
                disabled={busy}
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
                  disabled={busy}
                />
              </label>

              <label>
                <div className="loungeSubHint">종료일</div>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  style={inputStyle}
                  disabled={busy}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <div className="loungeSubHint">시작시간 (HH:mm)</div>
                <input
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  placeholder="10:00"
                  style={inputStyle}
                  disabled={busy}
                />
              </label>

              <label>
                <div className="loungeSubHint">종료시간 (HH:mm)</div>
                <input
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  placeholder="20:00"
                  style={inputStyle}
                  disabled={busy}
                />
              </label>
            </div>
          </div>

          {error && <div className="loungeNotice">{error}</div>}

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button" onClick={submit} disabled={!canSubmit}>
              {busy ? "처리 중..." : editingCode ? "수정 저장(코드 유지)" : "QR 발급"}
            </button>

            <button className="loungeSubBtn" type="button" onClick={resetForm} disabled={busy}>
              초기화
            </button>

            <button className="loungeSubBtn" type="button" onClick={copy} disabled={!ticketCode || busy}>
              ticketCode 복사
            </button>

            <button className="loungeSubBtn" type="button" onClick={() => setShowIssued((v) => !v)} disabled={busy}>
              {showIssued ? "발급 목록 닫기" : "발급 목록 보기"}
            </button>
          </div>
        </div>

        {/* QR 출력 */}
        {ticketCode && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">QR</h2>

            <p className="loungeSubHint">
              <strong>ticketCode</strong>: {ticketCode}
              <br />
              <strong>QR payload</strong>: {qrValue}
              <br />
              {editingCode ? "수정해도 " : "발급 후 "}
              <strong>ticketCode는 유지</strong>됩니다.
            </p>

            <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div ref={qrWrapRef} style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
                {/* ✅ 우선순위 1) 백엔드에서 내려준 image(base64/url) */}
                {qrImageSrc ? (
                  <img
                    src={qrImageSrc}
                    alt="QR"
                    style={{ width: 220, height: 220, display: "block" }}
                  />
                ) : (
                  // ✅ 우선순위 2) 없으면 FE에서 생성(그리고 자동 업로드 옵션으로 base64 전송)
                  <QRCode value={qrValue} size={220} />
                )}
              </div>

              <div className="loungeSubHint" style={{ maxWidth: 420 }}>
                스캔 화면에서는 ticketCode로 전시 정보를 조회합니다.
                <br />
                <strong>image는 조회용</strong>이며 URL 대신 <strong>base64로 저장</strong>하려면
                (AUTO_UPLOAD_QR_IMAGE=true)처럼 발급 후 업로드 로직을 사용하면 됩니다.
              </div>
            </div>
          </div>
        )}

        {/* 발급 목록 */}
        {showIssued && (
          <div className="loungeSubPanel">
            <h2 className="loungeSubPanelTitle">발급 목록</h2>

            {issued.length === 0 ? (
              <p className="loungeSubHint">아직 발급 기록이 없습니다.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {issued.map((t) => (
                  <div
                    key={t.ticketCode}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{t.title}</div>
                        <div className="loungeSubHint" style={{ marginTop: 4 }}>
                          <div>
                            <strong>CODE</strong>: {t.ticketCode}
                          </div>
                          <div>
                            <strong>ADDRESS</strong>: {t.address} {t.addressDetail ? `(${t.addressDetail})` : ""}
                          </div>
                          <div>
                            <strong>DATE</strong>: {t.startDate} ~ {t.endDate}
                          </div>
                          <div>
                            <strong>TIME</strong>: {t.startTime} ~ {t.endTime}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end" }}>
                        <button className="loungeSubBtn" type="button" onClick={() => startEdit(t)} disabled={busy}>
                          수정
                        </button>
                        <button
                          className="loungeSubBtn"
                          type="button"
                          onClick={() => {
                            setTicketCode(t.ticketCode);
                            setQrImageSrc(normalizeImageToSrc(t.image));
                          }}
                          disabled={busy}
                        >
                          QR 보기
                        </button>
                        <button className="loungeSubBtn" type="button" onClick={() => remove(t.ticketCode)} disabled={busy}>
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
