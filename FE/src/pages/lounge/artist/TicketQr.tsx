// FE/src/pages/lounge/artist/TicketQr.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import "../lounge.css";

import {
  createExhibitionTicket,
  deleteExhibitionByCode,
  listIssuedExhibitions,
  updateExhibitionByCode,
} from "../../../features/tickets/api";

// --- Types ---
type FeeType = "free" | "paid";

interface RawTicketData {
  memberUuid?: string;
  member_uuid?: string;

  address?: string;
  addressDetail?: string;
  address_detail?: string;

  title?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;

  ticketCode?: string | number;
  ticket_code?: string | number;

  // ✅ QR 이미지(저장용)
  image?: string;

  // ✅ 포스터 URL (camel/snake 모두 대응)
  posterUrl?: string;
  poster_url?: string;

  // ✅ 설명 (있으면)
  description?: string;
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

  // ✅ QR 이미지(저장된 base64/data-url)
  image?: string;

  // ✅ 포스터 URL
  posterUrl?: string;

  // ✅ 설명
  description?: string;
};

type FormState = {
  title: string;
  address: string;
  addressDetail: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;

  // ✅ 포스터 URL 입력 필드 추가
  posterUrl: string;

  // ✅ (옵션) 설명 입력 필드도 같이 두고 싶으면 사용
  // description: string;
};

type TabMode = "ISSUE" | "LIST";

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

  // (휴리스틱) SVG base64는 보통 PHN2Zy로 시작
  if (image.startsWith("PHN2Zy")) return `data:image/svg+xml;base64,${image}`;

  return `data:image/png;base64,${image}`;
}

function pickTicketCode(obj: RawTicketData | null | undefined): string {
  if (!obj) return "";
  const code = obj.ticketCode ?? obj.ticket_code;
  return code?.toString() ?? "";
}

function toForm(t?: Partial<TicketItem> | null): FormState {
  return {
    title: t?.title ?? "",
    address: t?.address ?? "",
    addressDetail: t?.addressDetail ?? "",
    startDate: t?.startDate ?? todayYYYYMMDD(),
    endDate: t?.endDate ?? todayYYYYMMDD(),
    startTime: t?.startTime ?? "10:00",
    endTime: t?.endTime ?? "20:00",
    posterUrl: t?.posterUrl ?? "",
    // description: t?.description ?? "",
  };
}

export default function TicketQr() {
  const [activeTab, setActiveTab] = useState<TabMode>("ISSUE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [ticketCode, setTicketCode] = useState<string>("");
  const [qrImageSrc, setQrImageSrc] = useState<string>("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => toForm(null));

  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const [issued, setIssued] = useState<TicketItem[]>([]);

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

  const reloadIssued = useCallback(async () => {
    try {
      const list = await listIssuedExhibitions();
      const rawArr = Array.isArray(list) ? (list as RawTicketData[]) : [];
      const normalized = rawArr
        .map((x) => {
          const code = pickTicketCode(x);
          if (!code) return null;
          return {
            memberUuid: x.memberUuid ?? x.member_uuid,
            address: x.address ?? "",
            addressDetail: x.addressDetail ?? x.address_detail ?? "",
            title: x.title ?? "",
            startDate: x.startDate ?? "",
            endDate: x.endDate ?? "",
            startTime: x.startTime ?? "",
            endTime: x.endTime ?? "",
            ticketCode: code,
            image: x.image,

            // ✅ 포스터 URL 매핑
            posterUrl: x.posterUrl ?? x.poster_url,

            // ✅ 설명(있으면)
            description: x.description,
          } as TicketItem;
        })
        .filter((item): item is TicketItem => item !== null);
      setIssued(normalized);
    } catch (e) {
      console.error("목록 로드 실패", e);
    }
  }, []);

  useEffect(() => {
    reloadIssued();
  }, [reloadIssued]);

  const resetForm = useCallback(() => {
    setError("");
    setBusy(false);
    setEditingCode(null);
    setTicketCode("");
    setQrImageSrc("");
    setForm(toForm(null));
  }, []);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError("");

    try {
      const feeFieldValue: FeeType = "free";

      const payload = {
        title: form.title.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,

        // 서버 스펙이 place를 요구하는 경우 대비
        place: form.address.trim(),

        feeType: feeFieldValue,

        // ✅ 포스터 URL 추가
        posterUrl: form.posterUrl.trim() || undefined,

        // ✅ 설명도 쓰려면 활성화
        // description: form.description.trim() || undefined,
      };

      if (editingCode) {
        await updateExhibitionByCode(editingCode, payload as any);
        setTicketCode(editingCode);
        alert("수정되었습니다.");
      } else {
        const res = (await createExhibitionTicket(payload as any)) as RawTicketData;
        const code = pickTicketCode(res);
        setTicketCode(code);

        const img = res?.image ? normalizeImageToSrc(res.image) : "";
        setQrImageSrc(img);

        alert("QR이 발급되었습니다.");
      }

      await reloadIssued();
    } catch (e: unknown) {
      console.error(e); // ✅ 배포에서도 추적 가능
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (t: TicketItem) => {
    setError("");
    setEditingCode(t.ticketCode);
    setTicketCode(t.ticketCode);
    setQrImageSrc(normalizeImageToSrc(t.image));
    setForm(toForm(t));
    setActiveTab("ISSUE");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (code: string) => {
    if (!confirm("이 발급 기록을 삭제할까요?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteExhibitionByCode(code);
      if (ticketCode === code) resetForm();
      await reloadIssued();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const downloadQr = () => {
    const wrap = qrWrapRef.current;
    const svg = wrap?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 1000;
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${ticketCode || "ticket"}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // QR SVG를 image(base64)로 자동 저장(목록/재방문용)
  useEffect(() => {
    if (!ticketCode || busy || qrImageSrc || activeTab !== "ISSUE") return;

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
      } catch (e) {
        console.error("자동 업로드 실패", e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ticketCode, busy, qrImageSrc, activeTab, reloadIssued]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 관리</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

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

        {activeTab === "ISSUE" && (
          <div className="fade-in">
            <div className="loungeSubPanel" style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 30,
                }}
              >
                <h2 className="loungeSubPanelTitle" style={{ margin: 0 }}>
                  {editingCode ? "전시 정보 수정" : "새 전시 등록"}
                </h2>
                {editingCode && (
                  <button className="loungeTextBtn" onClick={resetForm}>
                    새로 만들기
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gap: 24 }}>
                <div className="loungeInputGroup">
                  <label className="loungeLabel">전시 제목 *</label>
                  <input
                    className="loungeInput"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    disabled={busy}
                  />
                </div>

                <div className="loungeInputGroup">
                  <label className="loungeLabel">주소 *</label>
                  <input
                    className="loungeInput"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    disabled={busy}
                  />
                </div>

                <div className="loungeInputGroup">
                  <label className="loungeLabel">상세주소</label>
                  <input
                    className="loungeInput"
                    value={form.addressDetail}
                    onChange={(e) => setForm((p) => ({ ...p, addressDetail: e.target.value }))}
                    disabled={busy}
                  />
                </div>

                {/* ✅ 포스터 URL 입력 추가 */}
                <div className="loungeInputGroup">
                  <label className="loungeLabel">포스터 URL</label>
                  <input
                    className="loungeInput"
                    value={form.posterUrl}
                    onChange={(e) => setForm((p) => ({ ...p, posterUrl: e.target.value }))}
                    placeholder="/art/a13.jpg"
                    disabled={busy}
                  />
                  {form.posterUrl.trim() && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                        미리보기
                      </div>
                      <img
                        src={form.posterUrl.trim()}
                        alt="poster preview"
                        style={{
                          width: "100%",
                          maxWidth: 420,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          display: "block",
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <input
                    type="date"
                    className="loungeInput"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    disabled={busy}
                  />
                  <input
                    type="date"
                    className="loungeInput"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    disabled={busy}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <input
                    className="loungeInput"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    placeholder="10:00"
                    disabled={busy}
                  />
                  <input
                    className="loungeInput"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    placeholder="20:00"
                    disabled={busy}
                  />
                </div>
              </div>

              {error && <div className="loungeNotice">{error}</div>}
              <div className="loungeSubActions">
                <button
                  className="loungeSubBtn"
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                >
                  {busy ? "처리 중..." : editingCode ? "수정 저장" : "QR 발급"}
                </button>
              </div>
            </div>

            {ticketCode && (
              <div className="loungeSubPanel" style={{ marginTop: 40 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                  <div ref={qrWrapRef} style={{ background: "#fff", padding: 20, borderRadius: 16 }}>
                    {qrImageSrc ? (
                      <img src={qrImageSrc} alt="QR" style={{ width: 220, height: 220 }} />
                    ) : (
                      <QRCode value={qrValue} size={220} />
                    )}
                  </div>
                  <div className="loungeSubActions" style={{ gap: 12 }}>
                    <button
                      className="loungeSubBtn"
                      onClick={() => {
                        navigator.clipboard.writeText(ticketCode);
                        alert("복사됨");
                      }}
                    >
                      코드 복사
                    </button>
                    <button className="loungeSubBtn" onClick={downloadQr} style={{ borderColor: "#fff" }}>
                      QR 저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "LIST" && (
          <div className="fade-in">
            <div className="loungeSubPanel" style={{ textAlign: "left", minHeight: 300 }}>
              {issued.length === 0 ? (
                <div className="loungeEmpty">내역이 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {issued.map((t) => (
                    <div
                      key={t.ticketCode}
                      className="tasteCard"
                      style={{ padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 700 }}>{t.title}</div>
                        <div style={{ color: "#C8A97E", wordBreak: "break-all" }}>{t.ticketCode}</div>
                      </div>

                      <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
                        📍 {t.address} | 📅 {t.startDate} ~ {t.endDate}
                      </div>

                      {/* ✅ 포스터 표시 */}
                      {t.posterUrl && (
                        <img
                          src={t.posterUrl}
                          alt="poster"
                          style={{
                            width: "100%",
                            maxWidth: 520,
                            borderRadius: 14,
                            marginTop: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            display: "block",
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}

                      <div
                        className="loungeSubActions"
                        style={{ marginTop: 16, justifyContent: "flex-start", gap: 10 }}
                      >
                        <button className="loungeSubBtn" onClick={() => startEdit(t)}>
                          수정
                        </button>
                        <button
                          className="loungeSubBtn"
                          onClick={() => remove(t.ticketCode)}
                          style={{ color: "#ff6b6b" }}
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
