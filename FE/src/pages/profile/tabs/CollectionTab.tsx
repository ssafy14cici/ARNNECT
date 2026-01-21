import { useParams } from "react-router-dom";

export default function CollectionTab() {
  const { id } = useParams();
  const profileId = id ?? "me";

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>콜렉션</h3>
      <div style={{ color: "#666" }}>
        TODO: /api/users/{profileId}/collections 같은 엔드포인트로 연결
      </div>

      {/* 임시 확인용 */}
      <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
        profileId: {profileId}
      </div>
      <div
        style={{
          marginTop: 12,
          border: "1px dashed rgba(0,0,0,0.2)",
          borderRadius: 16,
          padding: 18,
          color: "rgba(0,0,0,0.55)",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>커스텀 티켓 콜렉션 준비중</div>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          이 탭은 추후 <strong>티켓 카드 UI</strong>와{" "}
          <code style={{ fontFamily: "monospace" }}>/api/users/{profileId}/collections</code>{" "}
          엔드포인트가 확정되면 연결합니다.
        </div>
      </div>
    </div>
  );
}
