// FE/src/pages/lounge/artist/TicketQr.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import "../lounge.css";

import {
  createExhibitionTicket,
  deleteExhibitionByCode,
  listIssuedExhibitions,
  updateExhibitionByCode,
  type ExhibitionByCodeResponse,
  type FeeType,
} from "../../../api/tickets";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type FormState = {
  title: string;
  place: string;
  startDate: string;
  endDate: string;

  feeType: FeeType;
  price: string; // input용
  durationMinutes: string; // input용

  posterUrl: string;
  description: string;
};

function exToForm(ex?: ExhibitionByCodeResponse | null): FormState {
  return {
    title: ex?.title ?? "",
    place: ex?.place ?? "",
    startDate: ex?.startDate ?? todayYYYYMMDD(),
    endDate: ex?.endDate ?? todayYYYYMMDD(),

    feeType: ex?.feeType ?? "free",
    price: ex?.price != null ? String(ex.price) : "",
    durationMinutes: ex?.durationMinutes != null ? String(ex.durationMinutes) : "",

    posterUrl: ex?.posterUrl ?? "",
    description: ex?.description ?? "",
  };
}

export default function TicketQr() {
  const [ticketCode, setTicketCode] = useState<string>(""); // 현재 QR 표시용
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ 수정 모드
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => exToForm(null));

  // 발급 목록
  const [issued, setIssued] = useState<ExhibitionByCodeResponse[]>([]);
  const [showIssued, setShowIssued] = useState(false);

  const canSubmit = useMemo(() => {
    const baseOk = form.title.trim().length > 0 && form.place.trim().length > 0;
    if (!baseOk) return false;
    if (busy) return false;

    if (form.feeType === "paid") {
      const p = Number(form.price);
      if (!Number.isFinite(p) || p < 0) return false;
    }
    if (form.durationMinutes.trim()) {
      const m = Number(form.durationMinutes);
      if (!Number.isFinite(m) || m < 0) return false;
    }
    return true;
  }, [form, busy]);

  const qrValue = useMemo(() => {
    if (!ticketCode) return "";
    return JSON.stringify({ v: 1, ticket_code: ticketCode });
  }, [ticketCode]);

  const reloadIssued = async () => {
    try {
      const list = await listIssuedExhibitions();
      setIssued(list);
    } catch (e: unknown) {
      // 목록 실패는 치명적이지 않아서 조용히
      // console.error(e);
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
      // payload 구성
      const payload = {
        title: form.title.trim(),
        place: form.place.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        feeType: form.feeType,
        price: form.feeType === "paid" ? Number(form.price || 0) : undefined,
        durationMinutes: form.durationMinutes.trim() ? Number(form.durationMinutes) : undefined,
        posterUrl: form.posterUrl.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      if (editingCode) {
        // ✅ ticket_code 고정, 내용만 수정
        await updateExhibitionByCode(editingCode, payload);
        setTicketCode(editingCode); // 수정한 티켓의 QR 유지 표시
      } else {
        // ✅ 신규 발급
        const res = await createExhibitionTicket(payload);
        setTicketCode(res.ticket_code);
      }

      await reloadIssued();
      setShowIssued(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "처리 실패";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setError("");
    setBusy(false);
    setEditingCode(null);
    setTicketCode("");
    setForm(exToForm(null));
  };

  const copy = async () => {
    if (!ticketCode) return;
    try {
      await navigator.clipboard.writeText(ticketCode);
    } catch {
      // ignore
    }
  };

  const startEdit = (ex: ExhibitionByCodeResponse) => {
    setError("");
    setEditingCode(ex.ticket_code);
    setTicketCode(ex.ticket_code); // 수정 대상 QR도 같이 보여주기
    setForm(exToForm(ex));
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
      if (ticketCode === code) setTicketCode("");
      if (editingCode === code) setEditingCode(null);
      await reloadIssued();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">전시 QR 발급 (Mock)</h1>
          <Link className="loungeBackLink" to="/lounge">
            ← 라운지로
          </Link>
        </div>

        <p className="loungeSubDesc">
          QR payload는 <strong>ticket_code만</strong> 포함합니다.
          <br />
          전시 정보는 로컬스토리지(mock DB)에 저장되며,
          <strong>ticket_code를 유지한 채 전시 정보를 수정</strong>할 수 있습니다.
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
              />
            </label>

            <label>
              <div className="loungeSubHint">장소 *</div>
              <input
                value={form.place}
                onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
                placeholder="예: 논현동 문영빌딩..."
                style={inputStyle}
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
                />
              </label>

              <label>
                <div className="loungeSubHint">종료일</div>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <div className="loungeSubHint">공연료</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="loungeSubBtn"
                    onClick={() => setForm((p) => ({ ...p, feeType: "free", price: "" }))}
                    disabled={busy}
                    style={{ opacity: form.feeType === "free" ? 1 : 0.55 }}
                  >
                    무료
                  </button>
                  <button
                    type="button"
                    className="loungeSubBtn"
                    onClick={() => setForm((p) => ({ ...p, feeType: "paid" }))}
                    disabled={busy}
                    style={{ opacity: form.feeType === "paid" ? 1 : 0.55 }}
                  >
                    유료
                  </button>
                </div>
              </label>

              <label>
                <div className="loungeSubHint">가격(유료일 때)</div>
                <input
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="예: 50000"
                  inputMode="numeric"
                  disabled={busy || form.feeType !== "paid"}
                  style={inputStyle}
                />
              </label>
            </div>

            <label>
              <div className="loungeSubHint">소요시간(분, 선택)</div>
              <input
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                placeholder="예: 70"
                inputMode="numeric"
                disabled={busy}
                style={inputStyle}
              />
            </label>

            <label>
              <div className="loungeSubHint">포스터 URL (선택)</div>
              <input
                value={form.posterUrl}
                onChange={(e) => setForm((p) => ({ ...p, posterUrl: e.target.value }))}
                placeholder="https://..."
                disabled={busy}
                style={inputStyle}
              />
            </label>

            <label>
              <div className="loungeSubHint">설명 (선택)</div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={5}
                disabled={busy}
                style={textareaStyle}
              />
            </label>
          </div>

          {error && <div className="loungeNotice">{error}</div>}

          <div className="loungeSubActions">
            <button className="loungeSubBtn" type="button" onClick={submit} disabled={!canSubmit}>
              {busy ? "처리 중..." : editingCode ? "수정 저장(코드 유지)" : "QR 발급(로컬 저장)"}
            </button>

            <button className="loungeSubBtn" type="button" onClick={resetForm} disabled={busy}>
              초기화
            </button>

            <button className="loungeSubBtn" type="button" onClick={copy} disabled={!ticketCode || busy}>
              ticket_code 복사
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
              <strong>ticket_code</strong>: {ticketCode}
              <br />
              <strong>QR payload</strong>: {qrValue}
              <br />
              전시 정보는 수정해도 <strong>ticket_code는 그대로</strong> 유지됩니다.
            </p>

            <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
                <QRCode value={qrValue} size={220} />
              </div>

              <div className="loungeSubHint" style={{ maxWidth: 420 }}>
                스캔 화면에서는 ticket_code로 전시 정보를 조회합니다.
                따라서 여기서 전시 내용을 수정하면 스캔 결과도 최신 내용으로 표시됩니다.
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
                {issued.map((ex) => (
                  <div
                    key={ex.ticket_code}
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
                        <div style={{ fontWeight: 800 }}>{ex.title}</div>
                        <div className="loungeSubHint" style={{ marginTop: 4 }}>
                          <div>
                            <strong>CODE</strong>: {ex.ticket_code}
                          </div>
                          <div>
                            <strong>PLACE</strong>: {ex.place}
                          </div>
                          <div>
                            <strong>DATE</strong>: {ex.startDate} ~ {ex.endDate}
                          </div>
                          <div>
                            <strong>FEE</strong>: {ex.feeType === "free" ? "무료" : `유료 (${ex.price ?? 0})`}
                          </div>
                          {ex.durationMinutes != null && (
                            <div>
                              <strong>DURATION</strong>: {ex.durationMinutes}분
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end" }}>
                        <button className="loungeSubBtn" type="button" onClick={() => startEdit(ex)} disabled={busy}>
                          수정
                        </button>
                        <button className="loungeSubBtn" type="button" onClick={() => setTicketCode(ex.ticket_code)} disabled={busy}>
                          QR 보기
                        </button>
                        <button className="loungeSubBtn" type="button" onClick={() => remove(ex.ticket_code)} disabled={busy}>
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};
