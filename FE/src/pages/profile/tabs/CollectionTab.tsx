// FE/src/pages/profile/tabs/CollectionTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadAll } from "../../../features/collectbook/storage";
import type { CollectBookItem } from "../../../features/collectbook/types";
import { useAuthStore } from "../../../features/auth/store";
import "./profileTabs.css";

export default function CollectionTab() {
  const nav = useNavigate();

  // ✅ routes.tsx가 ":memberUuid" 이므로 동일하게 맞춤
  const { memberUuid } = useParams();
  const rawProfileId = memberUuid ?? "me";

  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const role = useAuthStore((s) => s.role); // "general" | "artist" | null

  // ✅ "me"면 실제 uuid로 치환 (목업/실서버 공통)
  const effectiveProfileId = useMemo(() => {
    if (rawProfileId === "me") return authUser?.memberUuid ?? "me";
    return rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  // ✅ 내가 보고 있는 프로필이 "내 프로필"인지 판단
  const isOwner = useMemo(() => {
    if (!authUser?.memberUuid) return false;
    if (rawProfileId === "me") return true;
    return authUser.memberUuid === rawProfileId;
  }, [rawProfileId, authUser?.memberUuid]);

  const [items, setItems] = useState<CollectBookItem[]>(() => loadAll());

  // "내 프로필"일 때만 토글 가능 (타인은 public만)
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

    // ✅ ownerUuid 필드가 CollectBookItem에 있다면(너 에러 로그상 있음) 소유자 기준 필터링 권장
    // - 없으면 이 줄은 지워도 됨
    const byOwner = sorted.filter((x) => {
      const ownerUuid = (x as any).ownerUuid as string | undefined;
      if (!ownerUuid) return true; // 구버전 데이터 호환(없으면 통과)
      return ownerUuid === effectiveProfileId;
    });

    if (onlyPublic) return byOwner.filter((x) => x.visibility === "public");
    return byOwner;
  }, [items, onlyPublic, effectiveProfileId]);

  const goDetail = (collectBookId: string) => {
    // ✅ 상세 라우트는 /collectbook/:id
    // (주의) 라우트에서 collectbook은 general만 접근 가능하니
    // artist로 로그인했으면 이동이 막힐 수 있음.
    if (!isLoggedIn) {
      nav("/login", { state: { from: `/collectbook/${collectBookId}` } });
      return;
    }
    if (role && role !== "general") {
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
            라운지에서 수집한 티켓들이 이곳에 전시됩니다.{" "}
            {/* ✅ canonical 경로로 */}
            <Link to="/collectbook">Go to CollectBook</Link>
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

                {/* ✅ 티켓코드는 안 보여주기로 했으니 제거 */}

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
