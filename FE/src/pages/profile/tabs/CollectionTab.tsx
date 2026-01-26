// FE/src/pages/profile/tabs/CollectionTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

// ✅ 라운지 CollectBook에서 쓰는 로컬 저장소 유틸을 그대로 재사용
import { loadAll } from "../../../utils/collectbookStorage";
import type { CollectBookItem } from "../../../utils/collectbookStorage";

export default function CollectionTab() {
  const { id } = useParams();
  const profileId = id ?? "me"; // 실제 라우트가 /profile/me/... 이면 id는 "me"가 됨

  const [items, setItems] = useState<CollectBookItem[]>([]);
  const [onlyPublic, setOnlyPublic] = useState(profileId !== "me"); // 타인 프로필이면 기본 공개만

  const reload = () => {
    // 로컬 저장소에서 최신 목록 읽기
    const list = loadAll();
    setItems(list);
  };

  useEffect(() => {
    reload();
    // 같은 탭에서 라운지에서 추가해도 자동 감지는 어렵기 때문에
    // 탭으로 돌아올 때 최신화하려면 focus 이벤트로 한번 더 갱신
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.scannedAt ?? "").localeCompare(a.scannedAt ?? ""));
    if (profileId !== "me") return sorted.filter((x) => x.visibility === "public");
    return onlyPublic ? sorted.filter((x) => x.visibility === "public") : sorted;
  }, [items, onlyPublic, profileId]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>콜렉션</h3>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {profileId === "me" && (
            <label style={{ fontSize: 12, color: "#666", display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyPublic}
                onChange={(e) => setOnlyPublic(e.target.checked)}
              />
              공개만 보기
            </label>
          )}

          <button
            type="button"
            onClick={reload}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      </div>

      <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
        {profileId === "me" ? (
          <>
            라운지에서 스캔/등록한 티켓(콜렉트북)을 여기서도 보여줍니다.{" "}
            <Link to="/lounge/collectbook">라운지 콜렉트북으로 이동</Link>
          </>
        ) : (
          <>공개 설정된 콜렉션만 표시합니다.</>
        )}
      </div>

      {/* 목록 */}
      {visibleItems.length === 0 ? (
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>콜렉션이 없습니다</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            라운지에서 QR 스캔/등록을 하면 이 탭에도 표시됩니다.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleItems.map((it) => (
            <div
              key={it.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 16,
                padding: 14,
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {it.exhibition?.title ?? "전시 정보 없음"}
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  {it.visibility === "public" ? "공개" : "비공개"}
                </div>
              </div>

              <div style={{ marginTop: 6, fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                <div>장소: {it.exhibition?.place ?? "-"}</div>
                <div>
                  기간: {it.exhibition?.startDate ?? "-"} ~ {it.exhibition?.endDate ?? "-"}
                </div>
                <div>방문일: {it.visitedAt ?? "-"}</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#999" }}>
                ticketCode: <code style={{ fontFamily: "monospace" }}>{it.ticketCode}</code>
              </div>

              {it.memo && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
                  메모: {it.memo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 임시 확인용 */}
      <div style={{ marginTop: 14, fontSize: 12, color: "#999" }}>
        profileId: {profileId} · total: {items.length} · shown: {visibleItems.length}
      </div>
    </div>
  );
}
