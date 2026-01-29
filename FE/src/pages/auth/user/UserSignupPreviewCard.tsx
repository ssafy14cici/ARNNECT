// src/pages/auth/components/SignupPreviewCard.tsx
type Row = { k: string; v: string; mono?: boolean };

type Props = {
  badge: string;            // "ARTIST" | "USER"
  stepLabel: string;        // "STEP 2/4"
  mainTitle: string;        // 예: "가입 정보 미리보기"
  mainName: string;         // 예: 활동명/이름
  subLine?: string;         // 예: "문학 / 에세이"
  rows: Row[];
};

export default function SignupPreviewCard({
  badge,
  stepLabel,
  mainTitle,
  mainName,
  subLine,
  rows,
}: Props) {
  return (
    <div className="auth-preview-card">
      <div className="auth-preview-head">
        <div className="auth-preview-title">{mainTitle}</div>
        <div className="auth-preview-step">{stepLabel}</div>
      </div>

      <div className="auth-preview-main">
        <div className="auth-preview-badge">{badge}</div>
        <div className="auth-preview-name">{mainName}</div>
        {subLine ? <div className="auth-preview-sub">{subLine}</div> : null}
      </div>

      <div className="auth-preview-list">
        {rows.map((r, idx) => (
          <div key={idx} className="auth-preview-row">
            <div className="k">{r.k}</div>
            <div className={`v ${r.mono ? "mono" : ""}`}>{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
