// FE/src/pages/profile/tabs/CollectionTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { loadAll } from "../../../features/collectbook/storage";
import type { CollectBookItem } from "../../../features/collectbook/types";
import { useAuthStore } from "../../../features/auth/store";
import "./profileTabs.css";

type CollectBookItemWithOwner = CollectBookItem & { ownerUuid?: string };

export default function CollectionTab() {
  const nav = useNavigate();
  const { memberUuid } = useParams(); // routes.tsx: ":memberUuid"
  const rawProfileId = memberUuid ?? "me";

  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const viewerRole = useAuthStore((s) => s.role); // "general" | "artist" | null

  const effectiveProfileId = rawProfileId === "me" ? (authUser?.memberUuid ?? "me") : rawProfileId;
  const isOwner = rawProfileId === "me" || (!!authUser?.memberUuid && authUser.memberUuid === rawProfileId);

  const [items, setItems] = useState<CollectBookItem[]>(() => loadAll());

  const [onlyPublicForMe, setOnlyPublicForMe] = useState(false);
  const onlyPublic = !isOwner ? true : onlyPublicForMe;

  const reload = () => setItems(loadAll());

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.scannedAt ?? "").localeCompare(a.scannedAt ?? ""));

    const byOwner = sorted.filter((x) => {
      const ownerUuid = (x as CollectBookItemWithOwner).ownerUuid;
      if (!ownerUuid) return true; // 구버전 데이터 호환
      return ownerUuid === effectiveProfileId;
    });

    if (onlyPublic) return byOwner.filter((x) => x.visibility === "public");
    return byOwner;
  }, [items, onlyPublic, effectiveProfileId]);

  const goDetail = (collectBookId: string) => {
    if (!isLoggedIn) {
      nav("/login", { state: { from: `/collectbook/${collectBookId}` } });
      return;
    }
    if (viewerRole && viewerRole !== "general") {
      alert("콜렉트북 상세는 USER(General)만 접근 가능합니다.");
      return;
    }
    nav(`/collectbook/${collectBookId}`);
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Collection</h3>

        <div className="tab-controls">
          {isOwner && (
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
        {isOwner ? (
          <>
            라운지에서 수집한 티켓들이 이곳에 전시됩니다. <Link to="/collectbook">Go to CollectBook</Link>
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
            <button
              key={it.id}
              type="button"
              className="tab-card"
              onClick={() => goDetail(it.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="tab-card-body">
                <div className="tab-card-header">
                  <div className="tab-card-title">{it.exhibition?.title ?? "Unknown Exhibition"}</div>
                  <div className="tab-card-meta">{it.visibility === "public" ? "PUBLIC" : "PRIVATE"}</div>
                </div>

                <div className="tab-card-info">
                  <div>📍 {it.exhibition?.place ?? "-"}</div>
                  <div>
                    📅 {it.exhibition?.startDate ?? "-"} ~ {it.exhibition?.endDate ?? "-"}
                  </div>
                  <div>Visited: {it.visitedAt ?? "-"}</div>
                </div>

                {it.memo && (
                  <div style={{ marginTop: 12, fontSize: "0.9rem", color: "#ccc" }}>
                    "{it.memo}"
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
