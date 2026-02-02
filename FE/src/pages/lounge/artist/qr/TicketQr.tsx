import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../lounge.css";

import {
  createExhibitionTicket,
  updateExhibitionByCode,
  type FeeType,
} from "../../../../features/tickets/api";

import TicketForm, { type FormState } from "./TicketForm";
import QrPanel from "./QrPanel";
import { rememberDesign, normalizeImageToSrc, type TicketItem, useIssuedTickets } from "./useIssuedTickets";

// TicketDesignType import 추가
import { TicketDesignType } from "../../../../shared/ui/tickets/TicketPreview";

type TabMode = "ISSUE" | "LIST";

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

// 초기 폼 상태 설정 함수
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
    // 저장된 디자인이 있으면 불러오고 없으면 BASIC
    ticketDesign: (t?.ticketDesign as TicketDesignType) ?? "BASIC",
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

  const { issued, reloadIssued, removeIssued } = useIssuedTickets();

  useEffect(() => {
    reloadIssued().catch((e) => console.error("목록 로드 실패", e));
  }, [reloadIssued]);

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
      const feeType: FeeType = "free";

      // API 전송 Payload
      const payload: any = {
        title: form.title.trim(),
        place: form.address.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        feeType,
        // 확장 필드
        addressDetail: form.addressDetail.trim() || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        posterUrl: form.posterUrl.trim() || undefined,
        // ticketDesign 필드도 API가 지원한다면 보낼 수 있음. 
        // 지원하지 않는다면 로컬스토리지에만 저장 (아래 rememberDesign)
      };

      if (editingCode) {
        await updateExhibitionByCode(editingCode, payload);

        // 디자인 설정 저장
        rememberDesign(editingCode, form.ticketDesign);

        setTicketCode(editingCode);
        alert("수정되었습니다.");
      } else {
        const res = await createExhibitionTicket(payload);
        const code = (res as any)?.ticket_code?.toString?.() ?? "";
        setTicketCode(code);

        // 디자인 설정 저장
        rememberDesign(code, form.ticketDesign);

        const img = (res as any)?.image ? normalizeImageToSrc((res as any).image) : "";
        setQrImageSrc(img);

        alert("QR이 발급되었습니다.");
      }

      await reloadIssued();
    } catch (e: unknown) {
      console.error(e);
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
      await removeIssued(code);
      if (ticketCode === code) resetForm();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 관리</h1>
          <Link className="loungeBackLink" to="/lounge/qr">
            ← QR 메뉴로
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

              {/* TicketForm에 form 상태를 전달하여 내부에서 선택 및 미리보기 가능 */}
              <TicketForm
                form={form}
                busy={busy}
                onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
              />

              {error && <div className="loungeNotice">{error}</div>}

              <div className="loungeSubActions">
                <button className="loungeSubBtn" type="button" onClick={submit} disabled={!canSubmit}>
                  {busy ? "처리 중..." : editingCode ? "수정 저장" : "QR 발급"}
                </button>
              </div>
            </div>

            {ticketCode && (
              <QrPanel
                ticketCode={ticketCode}
                qrValue={qrValue}
                busy={busy}
                qrImageSrc={qrImageSrc}
                setQrImageSrc={setQrImageSrc}
                onReloadIssued={reloadIssued}
              />
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
                        <div style={{ fontWeight: 700 }}>
                          {t.title}
                          {/* 디자인 타입 표시 */}
                          <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.7, border: "1px solid #555", padding: "2px 6px", borderRadius: "4px" }}>
                            {t.ticketDesign}
                          </span>
                        </div>
                        <div style={{ color: "#C8A97E", wordBreak: "break-all" }}>{t.ticketCode}</div>
                      </div>

                      <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
                        📍 {t.address} | 📅 {t.startDate} ~ {t.endDate}
                      </div>
                      
                      {/* 목록에서도 작게 미리보기를 보여줄 수 있지만, 지금은 기존대로 포스터만 유지하거나 원하면 교체 가능 */}
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

                      <div className="loungeSubActions" style={{ marginTop: 16, justifyContent: "flex-start", gap: 10 }}>
                        <button className="loungeSubBtn" onClick={() => startEdit(t)}>
                          수정
                        </button>
                        <button className="loungeSubBtn" onClick={() => remove(t.ticketCode)} style={{ color: "#ff6b6b" }}>
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