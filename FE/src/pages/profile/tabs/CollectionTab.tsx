// FE/src/pages/profile/tabs/CollectionTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadAll } from "../../../features/collectbook/storage";
import type { CollectBookItem } from "../../../features/collectbook/types";
import "./profileTabs.css";

export default function CollectionTab() {
  const { id } = useParams();
  const profileId = id ?? "me";

  const [items, setItems] = useState<CollectBookItem[]>(() => loadAll());

  // "me"일 때만 토글 상태를 가짐 (타인 프로필이면 무조건 public만)
  const [onlyPublicForMe, setOnlyPublicForMe] = useState(false);
  const onlyPublic = profileId !== "me" ? true : onlyPublicForMe;

  const reload = () => setItems(loadAll());

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint가 reload deps 물면 reload를 useCallback으로 감싸도 됨(선택)
  }, [profileId]);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.scannedAt ?? "").localeCompare(a.scannedAt ?? ""));
    if (profileId !== "me") return sorted.filter((x) => x.visibility === "public");
    return onlyPublic ? sorted.filter((x) => x.visibility === "public") : sorted;
  }, [items, onlyPublic, profileId]);

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Collection</h3>

        <div className="tab-controls">
          {profileId === "me" && (
            <label className="tab-checkbox">
              <input
                type="checkbox"
                checked={onlyPublicForMe}
                onChange={(e) => setOnlyPublicForMe(e.target.checked)}
              />
              Public Only
            </label>
          )}

          <button type="button" onClick={reload} className="tab-btn">
            Reload
          </button>
        </div>
      </div>

      <div className="tab-desc">
        {profileId === "me" ? (
          <>
            라운지에서 수집한 티켓들이 이곳에 전시됩니다.
            <Link to="/lounge/collectbook">Go to Lounge</Link>
          </>
        ) : (
          <>공개 설정된 콜렉션만 표시합니다.</>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">Empty Collection</div>
          <div>라운지에서 QR 스캔으로 티켓을 등록해보세요.</div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {visibleItems.map((it) => (
            <div key={it.id} className="tab-card">
              <div className="tab-card-body">
                <div className="tab-card-header">
                  <div className="tab-card-title">
                    {it.exhibition?.title ?? "Unknown Exhibition"}
                  </div>
                  <div className="tab-card-meta">
                    {it.visibility === "public" ? "PUBLIC" : "PRIVATE"}
                  </div>
                </div>

                <div className="tab-card-info">
                  <div>📍 {it.exhibition?.place ?? "-"}</div>
                  <div>📅 {it.exhibition?.startDate ?? "-"} ~ {it.exhibition?.endDate ?? "-"}</div>
                  <div>Visited: {it.visitedAt ?? "-"}</div>
                </div>

                <div className="tab-card-code">
                  Ticket: {it.ticketCode}
                </div>

                {it.memo && (
                  <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#ccc' }}>
                    "{it.memo}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}