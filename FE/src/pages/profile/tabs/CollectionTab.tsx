// FE/src/pages/profile/tabs/CollectionTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../features/auth/store";
import { apiCollectBookList } from "../../../features/collectbook/api/real";
import type { TicketInfoResponse } from "../../../features/tickets/api/realTickets";
import "./profileTabs.css";

const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : "-");

export default function CollectionTab() {
  const nav = useNavigate();
  const { memberUuid } = useParams(); // routes.tsx: ":memberUuid"

  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const viewerRole = useAuthStore((s) => s.role); // "general" | "artist" | null

  const rawProfileId = memberUuid ?? "me";
  const effectiveProfileId = rawProfileId === "me" ? (authUser?.memberUuid ?? "me") : rawProfileId;
  const isOwner = rawProfileId === "me" || (!!authUser?.memberUuid && authUser.memberUuid === rawProfileId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<TicketInfoResponse[]>([]);

  const reload = async () => {
    if (effectiveProfileId === "me") {
      setItems([]);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const list = await apiCollectBookList(effectiveProfileId);
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      setItems([]);
      setError(e instanceof Error ? e.message : "콜렉트북을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // me인데 로그인정보 없으면 스킵
    if (effectiveProfileId === "me") return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProfileId]);

  const visibleItems = useMemo(() => {
    // 서버 응답에 scannedAt 같은 정렬키가 없어서, ticketId 기준 내림차순 정도로만 정렬
    return [...items].sort((a, b) => Number(b.ticketId) - Number(a.ticketId));
  }, [items]);

  const goDetail = (ticketId: number) => {
    if (!isLoggedIn) {
      nav("/login", { state: { from: `/lounge/collectbook/${ticketId}` } });
      return;
    }
    if (viewerRole && viewerRole !== "general") {
      alert("콜렉트북 상세는 USER(General)만 접근 가능합니다.");
      return;
    }
    nav(`/lounge/collectbook/${ticketId}`);
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Collection</h3>

        <div className="tab-controls">
          <button type="button" onClick={reload} className="tab-btn" disabled={busy || effectiveProfileId === "me"}>
            {busy ? "Loading..." : "Reload"}
          </button>
        </div>
      </div>

      <div className="tab-desc">
        {isOwner ? (
          <>
            라운지에서 수집한 티켓이 이곳에 표시됩니다. <Link to="/lounge/collectbook">Go to CollectBook</Link>
          </>
        ) : (
          <>해당 사용자의 콜렉트북 티켓 목록입니다.</>
        )}
      </div>

      {error && <div className="tab-empty">{error}</div>}

      {!error && visibleItems.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">Empty Collection</div>
          <div>라운지에서 QR 스캔으로 티켓을 등록해보세요.</div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {visibleItems.map((t) => (
            <button
              key={t.ticketId}
              type="button"
              className="tab-card"
              onClick={() => goDetail(Number(t.ticketId))}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="tab-card-body">
                <div className="tab-card-header">
                  <div className="tab-card-title">{t.title ?? "Untitled"}</div>
                  <div className="tab-card-meta">{t.ticketCode}</div>
                </div>

                <div className="tab-card-info">
                  <div>📍 {t.address ?? "-"}</div>
                  <div>
                    📅 {t.startDate ?? "-"} ~ {t.endDate ?? "-"}
                  </div>
                  <div>
                    ⏰ {hhmm(t.startTime)} ~ {hhmm(t.endTime)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
