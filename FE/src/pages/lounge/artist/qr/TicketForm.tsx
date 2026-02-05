// FE/src/pages/lounge/artist/qr/TicketForm.tsx
import { ChangeEvent, type RefObject } from "react";
import type { TicketDesign } from "./useIssuedTickets";
import TicketPreview from "../../../../shared/ui/tickets/TicketPreview";

// TicketQr.tsx에서 사용하는 FormState와 일치시킴
export type FormState = {
  title: string;
  address: string;
  addressDetail: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  posterUrl: string;
  ticketDesign: TicketDesign;
};

type Props = {
  form: FormState;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;

  // ✅ ticketImage 캡처용
  previewRef: RefObject<HTMLDivElement>;
};

export default function TicketForm({ form, busy, onChange, previewRef }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name as keyof FormState]: value });
  };

  const designOptions: { value: TicketDesign; label: string }[] = [
    { value: "BASIC", label: "Basic (기본)" },
    { value: "MODERN", label: "Modern (모던)" },
    { value: "MINIMAL", label: "Minimal (미니멀)" },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "flex-start" }}>
      {/* [LEFT] 입력 폼 영역 */}
      <div style={{ flex: 1, minWidth: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 1. 디자인 선택 */}
        <div className="loungeInputGroup">
          <label className="loungeLabel">티켓 디자인 선택</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
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

        {/* 4. 포스터 URL (서버 전송 X, ticketImage 캡처에만 반영됨) */}
        <div className="loungeInputGroup">
          <label className="loungeLabel">포스터 URL</label>
          <input
            className="loungeInput"
            name="posterUrl"
            value={form.posterUrl}
            onChange={handleChange}
            placeholder="https://example.com/poster.jpg"
            disabled={busy}
          />
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "6px" }}>
            * URL을 입력하면 우측 미리보기에 이미지가 적용됩니다. (CORS에 따라 캡처가 실패할 수 있음)
          </p>
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
          }}
        >
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
              posterUrl: form.posterUrl,
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
