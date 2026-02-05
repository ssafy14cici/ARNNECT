// FE/src/pages/lounge/artist/qr/TicketForm.tsx
import { ChangeEvent, type RefObject, useCallback } from "react";
import type { TicketDesign } from "./useIssuedTickets";
import TicketPreview from "../../../../shared/ui/tickets/TicketPreview";
import QRCode from "react-qr-code";

// TicketQr.tsx에서 사용하는 FormState와 일치시킴
export type FormState = {
  title: string;
  address: string;
  addressDetail: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;

  // ✅ URL 입력 제거 → 파일 업로드로 변경
  posterFile: File | null;
  posterPreviewUrl: string; // TicketPreview에 넘길 src(dataURL)

  ticketDesign: TicketDesign;
};

type Props = {
  form: FormState;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;

  // ✅ ticketImage 캡처용
  previewRef: RefObject<HTMLDivElement | null>;

  // ✅ 캡처 이미지에 포함될 QR 값
  qrValue: string;
};

export default function TicketForm({ form, busy, onChange, previewRef, qrValue }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name as keyof FormState]: value } as Partial<FormState>);
  };

  const designOptions: { value: TicketDesign; label: string }[] = [
    { value: "BASIC", label: "Basic (기본)" },
    { value: "MODERN", label: "Modern (모던)" },
    { value: "MINIMAL", label: "Minimal (미니멀)" },
    { value: "HOLO_ABSTRACT", label: "Holo (홀로)" },
    { value: "SIMPLE", label: "Simple (심플)" },
    { value: "PURPLE", label: "Purple (퍼플)" },
    { value: "PINK", label: "Pink (핑크)" },
    { value: "RED", label: "Red (레드)" },
    
  ];

  const onPickPoster = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (!file) {
        onChange({ posterFile: null, posterPreviewUrl: "" });
        return;
      }

      // ✅ 캡처 안정성을 위해 objectURL 대신 dataURL 사용(taint/CORS 리스크 줄임)
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
        r.onerror = () => resolve("");
        r.readAsDataURL(file);
      });

      onChange({
        posterFile: file,
        posterPreviewUrl: dataUrl,
      });
    },
    [onChange],
  );

  const clearPoster = useCallback(() => {
    onChange({ posterFile: null, posterPreviewUrl: "" });
  }, [onChange]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "flex-start" }}>
      {/* [LEFT] 입력 폼 영역 */}
      <div style={{ flex: 1, minWidth: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 1. 디자인 선택 */}
        <div className="loungeInputGroup">
          <label className="loungeLabel">티켓 디자인 선택</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {/* <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}> */}
            {designOptions.map((opt) => {
              const active = form.ticketDesign === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ticketDesign: opt.value })}
                  disabled={busy}
                  style={{
                    borderRadius: 12,
                    padding: "12px 8px",
                    border: active ? "2px solid #C8A97E" : "1px solid rgba(255,255,255,0.14)",
                    background: active ? "rgba(200, 169, 126, 0.15)" : "rgba(255,255,255,0.05)",
                    color: active ? "#C8A97E" : "rgba(255,255,255,0.7)",
                    fontWeight: active ? 700 : 400,
                    cursor: "pointer",
                    fontSize: "13px",
                    transition: "all 0.2s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 기본 정보 */}
        <div className="loungeInputGroup">
          <label className="loungeLabel">전시 제목 *</label>
          <input
            className="loungeInput"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="전시회 이름을 입력하세요"
            disabled={busy}
          />
        </div>

        <div className="loungeInputGroup">
          <label className="loungeLabel">장소 (주소) *</label>
          <input
            className="loungeInput"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="예: 예술의 전당"
            disabled={busy}
          />
        </div>

        <div className="loungeInputGroup">
          <label className="loungeLabel">상세 주소 (선택)</label>
          <input
            className="loungeInput"
            name="addressDetail"
            value={form.addressDetail}
            onChange={handleChange}
            placeholder="예: 2층 제 1전시실"
            disabled={busy}
          />
        </div>

        {/* 3. 일정 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="loungeInputGroup">
            <label className="loungeLabel">시작일</label>
            <input
              type="date"
              className="loungeInput"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              disabled={busy}
            />
          </div>
          <div className="loungeInputGroup">
            <label className="loungeLabel">종료일</label>
            <input
              type="date"
              className="loungeInput"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              disabled={busy}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="loungeInputGroup">
            <label className="loungeLabel">오픈 시간</label>
            <input
              type="time"
              className="loungeInput"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              disabled={busy}
            />
          </div>
          <div className="loungeInputGroup">
            <label className="loungeLabel">마감 시간</label>
            <input
              type="time"
              className="loungeInput"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              disabled={busy}
            />
          </div>
        </div>

        {/* 4. 포스터 이미지 파일 업로드 */}
        <div className="loungeInputGroup">
          <label className="loungeLabel">포스터 이미지</label>

          <input type="file" accept="image/*" disabled={busy} onChange={onPickPoster} />

          {form.posterPreviewUrl ? (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>선택됨: {form.posterFile?.name ?? "poster"}</span>
              <button type="button" className="loungeTextBtn" onClick={clearPoster} disabled={busy}>
                제거
              </button>
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "6px" }}>
              * 업로드한 포스터는 우측 티켓 미리보기/캡처(ticketImage)에 포함됩니다.
            </p>
          )}
        </div>
      </div>

      {/* [RIGHT] 실시간 미리보기 영역 (ticketImage 캡처 대상) */}
      <div
        style={{
          width: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "sticky",
          top: "20px",
        }}
      >
        <label className="loungeLabel" style={{ textAlign: "center", color: "#C8A97E" }}>
          TICKET PREVIEW
        </label>

        <div
          ref={previewRef}
          style={{
            padding: "20px",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: "16px",
            backgroundColor: "#000",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            position: "relative", // ✅ QR 오버레이용
          }}
        >
          {/* ✅ 캡처 이미지(ticketImage)에 QR이 포함되도록 오버레이 */}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "#fff",
              padding: 8,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          >
            <QRCode value={qrValue} size={72} />
          </div>

          <TicketPreview
            designType={form.ticketDesign}
            data={{
              title: form.title,
              address: form.address,
              addressDetail: form.addressDetail,
              startDate: form.startDate,
              endDate: form.endDate,
              startTime: form.startTime,
              endTime: form.endTime,
              // ✅ 기존 prop 이름 유지하되, dataURL을 넣음
              posterUrl: form.posterPreviewUrl,
            }}
          />
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
          * 발급 시 QR코드 포함된 티켓 이미지(ticketImage)가 서버에 저장됩니다.
        </div>
      </div>
    </div>
  );
}
