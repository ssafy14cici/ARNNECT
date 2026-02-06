// FE/src/pages/lounge/artist/qr/TicketQr.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toBlob } from "html-to-image";
import "../../lounge.css";

import QRCodeLib from "qrcode";

import { createTicket, updateTicket } from "../../../../features/tickets/api/realTickets";
import TicketForm, { type FormState } from "./TicketForm";
import QrPanel from "./QrPanel";
import { rememberDesign, type TicketItem, useIssuedTickets } from "./useIssuedTickets";
import { useAuthStore } from "../../../../features/auth/store";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

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

function toTimeHHmmss(v: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

function makeTicketCode() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `T_${crypto.randomUUID()}`;
  return `T_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toForm(t?: Partial<TicketItem> | null): FormState {
  return {
    title: t?.title ?? "",
    address: t?.address ?? "",
    addressDetail: t?.addressDetail ?? "",
    startDate: t?.startDate ?? todayYYYYMMDD(),
    endDate: t?.endDate ?? todayYYYYMMDD(),
    startTime: t?.startTime && isHHmm(String(t.startTime).slice(0, 5)) ? String(t.startTime).slice(0, 5) : "10:00",
    endTime: t?.endTime && isHHmm(String(t.endTime).slice(0, 5)) ? String(t.endTime).slice(0, 5) : "20:00",
    posterFile: null,
    posterPreviewUrl: resolveMediaUrl((t as any)?.posterUrl ?? (t as any)?.posterImageUrl ?? (t as any)?.posterImageName ?? ""),
    ticketDesign: t?.ticketDesign ?? "BASIC",
  };
}

async function makeQrImageFile(ticketCode: string) {
  const dataUrl = await QRCodeLib.toDataURL(ticketCode, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  return new File([blob], `QR_${ticketCode}.png`, { type: blob.type || "image/png" });
}

async function waitImagesLoaded(el: HTMLElement) {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );
}

async function makeTicketImageFile(previewEl: HTMLElement | null, ticketCode: string, title: string) {
  // @ts-ignore
  if (document.fonts?.ready) {
    // @ts-ignore
    await document.fonts.ready.catch(() => {});
  }

  if (previewEl) {
    try {
      await waitImagesLoaded(previewEl);
      const blob = await toBlob(previewEl, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#000",
      });
      if (blob) return new File([blob], `TICKET_${ticketCode}.png`, { type: "image/png" });
    } catch {
      // fallthrough
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1400;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ticketImage 생성 실패");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#C8A97E";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("ARNNECT TICKET", 60, 120);

  ctx.fillStyle = "#fff";
  ctx.font = "28px sans-serif";
  ctx.fillText(`CODE: ${ticketCode}`, 60, 210);
  ctx.fillText(`TITLE: ${title.slice(0, 22)}`, 60, 270);

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"));
  return new File([blob], `TICKET_${ticketCode}.png`, { type: "image/png" });
}

export default function TicketQr() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabMode>("ISSUE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [ticketId, setTicketId] = useState<number | null>(null);
  const [code, setCode] = useState<string>(() => makeTicketCode());
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>(() => toForm(null));
  const previewRef = useRef<HTMLDivElement | null>(null);

  const artistUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const { issued, reloadIssued, removeIssued } = useIssuedTickets(artistUuid);

  useEffect(() => {
    if (!artistUuid) return;
    reloadIssued().catch((e) => console.error("목록 로드 실패", e));
  }, [artistUuid, reloadIssued]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!form.title.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.startDate || !form.endDate) return false;
    if (!isHHmm(form.startTime) || !isHHmm(form.endTime)) return false;
    return true;
  }, [form, busy]);

  const resetForm = useCallback(() => {
    setError("");
    setBusy(false);
    setEditingTicketId(null);
    setTicketId(null);
    setCode(makeTicketCode());
    setForm(toForm(null));
  }, []);

  const startEdit = useCallback((t: TicketItem) => {
    setError("");
    setEditingTicketId(t.ticketId);
    setTicketId(t.ticketId);
    setCode(t.ticketCode);
    setForm(toForm(t));
    setActiveTab("ISSUE");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const editIdRaw = params.get("edit");
    if (!editIdRaw) return;

    const editId = Number(editIdRaw);
    if (!Number.isFinite(editId)) return;
    if (!issued || issued.length === 0) return;

    const found = issued.find((x) => x.ticketId === editId);
    if (!found) return;

    startEdit(found);
  }, [params, issued, startEdit]);

  const submit = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setError("");

    try {
      const qrFile = await makeQrImageFile(code);
      const ticketFile = await makeTicketImageFile(previewRef.current, code, form.title.trim());

      const fd = new FormData();
      fd.append("ticketCode", code);
      fd.append("title", form.title.trim());
      fd.append("address", form.address.trim());
      fd.append("addressDetail", form.addressDetail ?? "");
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("startTime", toTimeHHmmss(form.startTime));
      fd.append("endTime", toTimeHHmmss(form.endTime));
      fd.append("qrImage", qrFile);
      fd.append("ticketImage", ticketFile);

      if (form.posterFile) {
        fd.append("poster", form.posterFile);
      }

      const res = editingTicketId ? await updateTicket(editingTicketId, fd) : await createTicket(fd);

      const nextId = typeof (res as any)?.ticketId === "number" ? (res as any).ticketId : ticketId;
      const nextCode =
        typeof (res as any)?.ticketCode === "string" && (res as any).ticketCode ? (res as any).ticketCode : code;

      setTicketId(nextId ?? null);
      setCode(nextCode);

      rememberDesign(nextCode, form.ticketDesign);

      alert(editingTicketId ? "수정되었습니다." : "QR이 발급되었습니다.");
      await reloadIssued();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: TicketItem) => {
    if (!confirm("이 발급 기록을 삭제할까요?")) return;

    setBusy(true);
    setError("");
    try {
      await removeIssued(t);
      if (ticketId === t.ticketId) resetForm();
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
        <div className="loungeSubTop" style={{ position: "relative", zIndex: 100 }}>
          <h1 className="loungeSubTitle">QR Ticket Manager</h1>
          <button
            type="button"
            className="loungeBackLink"
            onClick={() => nav("/lounge")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ← Back to Lounge
          </button>
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
                  {editingTicketId ? "전시 정보 수정" : "새 전시 등록"}
                </h2>

                {editingTicketId && (
                  <button type="button" className="loungeTextBtn" onClick={resetForm}>
                    새로 만들기
                  </button>
                )}
              </div>

              <TicketForm
                form={form}
                busy={busy}
                onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
                previewRef={previewRef}
                qrValue={code}
              />

              {error && <div className="loungeNotice">{error}</div>}

              <div className="loungeSubActions">
                <button className="loungeSubBtn" type="button" onClick={submit} disabled={!canSubmit}>
                  {busy ? "처리 중..." : editingTicketId ? "수정 저장" : "QR 발급"}
                </button>
              </div>
            </div>

            {code && <QrPanel ticketCode={code} busy={busy} />}
          </div>
        )}

        {activeTab === "LIST" && (
          <div className="fade-in">
            <div className="loungeSubPanel" style={{ textAlign: "left", minHeight: 300 }}>
              {issued.length === 0 ? (
                <div className="loungeEmpty">내역이 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {issued.map((t) => {
                    const ticketImg = resolveMediaUrl((t as any).ticketImageName);
                    

                    return (
                      <div
                        key={t.ticketId}
                        className="tasteCard"
                        style={{ padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>
                            {t.title}
                            <span
                              style={{
                                marginLeft: 10,
                                fontSize: 12,
                                opacity: 0.7,
                                border: "1px solid #555",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              {t.ticketDesign}
                            </span>
                          </div>
                          <div style={{ color: "#C8A97E", wordBreak: "break-all" }}>{t.ticketCode}</div>
                        </div>

                        <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
Address {t.address} | Period {t.startDate} ~ {t.endDate}
                        </div>

                        {ticketImg && (
                          <div style={{ position: "relative", marginTop: 14, maxWidth: 520 }}>
                            <img
                              src={ticketImg}
                              alt="ticket"
                              style={{
                                width: "100%",
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

                        <div
                          className="loungeSubActions"
                          style={{ marginTop: 16, justifyContent: "flex-start", gap: 10 }}
                        >
                          <button
                            type="button"
                            className="loungeSubBtn"
                            onClick={() => startEdit(t)}
                            disabled={busy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="loungeSubBtn"
                            onClick={async () => {
                              await remove(t);
                            }}
                            disabled={busy}
                            style={{ color: "#ff6b6b" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
