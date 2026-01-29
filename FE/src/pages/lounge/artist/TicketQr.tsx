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

// --- Helpers ---
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isHHmm(v: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function base64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function svgToDataUrl(svgEl: SVGElement) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = base64EncodeUnicode(xml);
  return `data:image/svg+xml;base64,${svg64}`;
}

function normalizeImageToSrc(image?: string | null) {
  if (!image) return "";
  if (image.startsWith("data:image/")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `data:image/png;base64,${image}`;
}

function pickTicketCode(obj: any): string {
  return obj?.ticketCode ?? obj?.ticket_code ?? obj?.ticketCode?.toString?.() ?? "";
}

// --- Types ---
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
  image?: string;
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

// ✅ 화면 모드 정의
type TabMode = "ISSUE" | "LIST";

export default function TicketQr() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<TabMode>("ISSUE"); // 'ISSUE' or 'LIST'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // --- Issue (Form) State ---
  const [ticketCode, setTicketCode] = useState<string>("");
  const [qrImageSrc, setQrImageSrc] = useState<string>("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  
  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const AUTO_UPLOAD_QR_IMAGE = true;

  // --- List State ---
  const [issued, setIssued] = useState<TicketItem[]>([]);

  // --- Derived ---
  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!form.title.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.startDate || !form.endDate) return false;
    if (!isHHmm(form.startTime) || !isHHmm(form.endTime)) return false;
    return true;
  }, [form, busy]);

  const qrValue = useMemo(() => {
    if (!ticketCode) return "";
    return JSON.stringify({ v: 1, ticket_code: ticketCode });
  }, [ticketCode]);

  // --- API Methods ---
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
    } catch { /* quiet */ }
  };

  useEffect(() => { reloadIssued(); }, []);

  // --- Actions ---

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError("");
    try {
      const payload = {
        title: form.title.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
      };

      if (editingCode) {
        await updateExhibitionByCode(editingCode, payload);
        setTicketCode(editingCode);
        alert("수정되었습니다.");
      } else {
        const res: any = await createExhibitionTicket(payload);
        const code = pickTicketCode(res);
        setTicketCode(code);
        const img = res?.image ? normalizeImageToSrc(res.image) : "";
        setQrImageSrc(img);
        alert("QR이 발급되었습니다.");
      }
      await reloadIssued();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setError(""); setBusy(false); setEditingCode(null);
    setTicketCode(""); setQrImageSrc(""); setForm(toForm(null));
  };

  // ✅ 목록에서 '수정' 누르면 -> 발급 탭으로 이동해서 데이터 채움
  const startEdit = (t: TicketItem) => {
    setError("");
    setEditingCode(t.ticketCode);
    setTicketCode(t.ticketCode);
    setQrImageSrc(normalizeImageToSrc(t.image));
    setForm(toForm(t));
    
    // 탭 이동
    setActiveTab("ISSUE");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (code: string) => {
    if (!confirm("이 발급 기록을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      await deleteExhibitionByCode(code);
      if (ticketCode === code) resetForm();
      await reloadIssued();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  // ✅ QR 이미지 다운로드 함수 (Canvas 사용)
  const downloadQr = () => {
    const wrap = qrWrapRef.current;
    const svg = wrap?.querySelector("svg");
    
    if (!svg) {
      alert("QR 코드를 찾을 수 없습니다.");
      return;
    }

    // 1. SVG 데이터를 문자열로 변환
    const svgData = new XMLSerializer().serializeToString(svg);
    // 2. Blob 객체 생성
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // 3. 이미지를 로드해서 캔버스에 그림 (고화질 변환)
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // QR 해상도 설정 (넉넉하게 1000px)
      const size = 1000;
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        // 배경을 흰색으로 채움 (투명하면 검은 배경에서 안 보일 수 있음)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
        
        // 이미지를 캔버스에 그림
        ctx.drawImage(img, 0, 0, size, size);
      }

      // 4. 다운로드 링크 생성 및 클릭
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${ticketCode || "ticket"}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();

      // 메모리 해제
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  // QR Auto Upload
  useEffect(() => {
    if (!AUTO_UPLOAD_QR_IMAGE || !ticketCode || busy || qrImageSrc) return;
    if (activeTab !== "ISSUE") return; 

    const timer = setTimeout(async () => {
      const wrap = qrWrapRef.current;
      const svg = wrap?.querySelector("svg");
      if (!svg) return;
      const dataUrl = svgToDataUrl(svg);
      setQrImageSrc(dataUrl);
      const base64Only = dataUrl.split(",")[1] ?? "";
      try {
        await updateExhibitionByCode(ticketCode, { image: base64Only } as any);
        await reloadIssued();
      } catch { /* ignore */ }
    }, 100);
    return () => clearTimeout(timer);
  }, [ticketCode, busy, qrImageSrc, activeTab]);


  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 관리</h1>
          <Link className="loungeBackLink" to="/lounge">← 라운지로</Link>
        </div>

        {/* ✅ [탭 버튼] 화면 전환 컨트롤 */}
        <div className="loungeSegmentNav">
          <button 
            type="button"
            className={`loungeSegmentBtn ${activeTab === "ISSUE" ? "active" : ""}`}
            onClick={() => setActiveTab("ISSUE")}
          >
            QR 발급 / 수정
          </button>
          <button 
            type="button"
            className={`loungeSegmentBtn ${activeTab === "LIST" ? "active" : ""}`}
            onClick={() => setActiveTab("LIST")}
          >
            발급 목록 ({issued.length})
          </button>
        </div>

        {/* =========================================================
            VIEW 1: QR 발급 (ISSUE)
           ========================================================= */}
        {activeTab === "ISSUE" && (
          <div className="fade-in">
            <p className="loungeSubDesc">
              전시 정보를 입력하여 관람객을 위한 <strong>QR 코드</strong>를 생성하세요.
            </p>

            <div className="loungeSubPanel" style={{ textAlign: 'left' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
                <h2 className="loungeSubPanelTitle" style={{ margin: 0 }}>
                  {editingCode ? "전시 정보 수정" : "새 전시 등록"}
                </h2>
                {editingCode && (
                  <button className="loungeTextBtn" onClick={resetForm}>
                    취소하고 새로 만들기
                  </button>
                )}
              </div>

              {/* 입력 폼 */}
              <div style={{ display: "grid", gap: 24 }}>
                <div className="loungeInputGroup">
                  <label className="loungeLabel">전시 제목 *</label>
                  <input
                    className="loungeInput"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="예: 원형하는 몸: Being Being Being"
                    disabled={busy}
                  />
                </div>

                <div className="loungeInputGroup">
                  <label className="loungeLabel">주소 *</label>
                  <input
                    className="loungeInput"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="기본 주소 (시/군/구)"
                    disabled={busy}
                  />
                </div>

                <div className="loungeInputGroup">
                  <label className="loungeLabel">상세주소 (선택)</label>
                  <input
                    className="loungeInput"
                    value={form.addressDetail}
                    onChange={(e) => setForm((p) => ({ ...p, addressDetail: e.target.value }))}
                    placeholder="건물명, 층수 등"
                    disabled={busy}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div className="loungeInputGroup">
                    <label className="loungeLabel">시작일</label>
                    <input
                      type="date"
                      className="loungeInput"
                      value={form.startDate}
                      onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                      disabled={busy}
                    />
                  </div>
                  <div className="loungeInputGroup">
                    <label className="loungeLabel">종료일</label>
                    <input
                      type="date"
                      className="loungeInput"
                      value={form.endDate}
                      onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div className="loungeInputGroup">
                    <label className="loungeLabel">시작시간</label>
                    <input
                      className="loungeInput"
                      value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                      placeholder="10:00"
                      disabled={busy}
                    />
                  </div>
                  <div className="loungeInputGroup">
                    <label className="loungeLabel">종료시간</label>
                    <input
                      className="loungeInput"
                      value={form.endTime}
                      onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                      placeholder="20:00"
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>

              {error && <div className="loungeNotice">{error}</div>}

              <div className="loungeSubActions">
                <button className="loungeSubBtn" type="button" onClick={submit} disabled={!canSubmit}>
                  {busy ? "처리 중..." : editingCode ? "수정사항 저장" : "QR 발급하기"}
                </button>
              </div>
            </div>

            {/* QR 생성 결과 (발급 직후 확인용) */}
            {ticketCode && (
              <div className="loungeSubPanel" style={{ marginTop: 40 }}>
                <h2 className="loungeSubPanelTitle">QR 코드 생성됨</h2>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                  <div ref={qrWrapRef} style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
                    {qrImageSrc ? (
                      <img src={qrImageSrc} alt="QR" style={{ width: 220, height: 220, display: "block" }} />
                    ) : (
                      <QRCode value={qrValue} size={220} />
                    )}
                  </div>
                  
                  <div className="loungeSubHint">
                    CODE: <strong style={{ color: "#C8A97E" }}>{ticketCode}</strong>
                  </div>

                  <div className="loungeSubActions" style={{ justifyContent: 'center', marginTop: 0, gap: 12 }}>
                    <button 
                      className="loungeSubBtn" 
                      onClick={() => { try { navigator.clipboard.writeText(ticketCode); alert("코드가 복사되었습니다."); } catch {} }}
                    >
                      코드 복사
                    </button>
                    
                    {/* ✅ 저장 버튼 추가 */}
                    <button 
                      className="loungeSubBtn" 
                      onClick={downloadQr}
                      style={{ borderColor: '#fff', color: '#fff' }}
                    >
                      QR 이미지 저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            VIEW 2: 발급 목록 (LIST)
           ========================================================= */}
        {activeTab === "LIST" && (
          <div className="fade-in">
            <p className="loungeSubDesc">
              지금까지 발급한 전시 QR 목록입니다.
            </p>

            <div className="loungeSubPanel" style={{ textAlign: 'left', minHeight: 300 }}>
              {issued.length === 0 ? (
                <div className="loungeEmpty">
                  발급된 내역이 없습니다.<br />
                  'QR 발급' 탭에서 새로운 티켓을 생성해보세요.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {issued.map((t) => (
                    <div key={t.ticketCode} className="tasteCard" style={{ padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{t.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#C8A97E', fontFamily: 'monospace' }}>{t.ticketCode}</div>
                      </div>
                      
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
                        <div>📍 {t.address} {t.addressDetail}</div>
                        <div>📅 {t.startDate} ~ {t.endDate} ({t.startTime}-{t.endTime})</div>
                      </div>

                      <div className="loungeSubActions" style={{ marginTop: 0, justifyContent: 'flex-start', gap: 10 }}>
                        <button 
                          className="loungeSubBtn" 
                          onClick={() => startEdit(t)}
                        >
                          수정 / QR보기
                        </button>
                        <button 
                          className="loungeSubBtn" 
                          onClick={() => remove(t.ticketCode)} 
                          style={{ borderColor: 'rgba(255, 107, 107, 0.5)', color: '#ff6b6b' }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}