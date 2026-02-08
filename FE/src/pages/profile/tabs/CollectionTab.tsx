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
  const resolvedMeUuid = authUser?.memberUuid ? String(authUser.memberUuid) : "";
  const effectiveProfileId = rawProfileId === "me" ? resolvedMeUuid : rawProfileId;

  // ✅ "me"인데 authUser가 없으면(하이드레이트 전/로그아웃) API를 못 때림 → UX로 안내/로그인 유도
  const needsLoginForMe = rawProfileId === "me" && !resolvedMeUuid;

  const isOwner =
    rawProfileId === "me" ||
    (!!authUser?.memberUuid && String(authUser.memberUuid) === String(rawProfileId));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<TicketInfoResponse[]>([]);

  const reload = async () => {
    if (needsLoginForMe) {
      setItems([]);
      setError("로그인이 필요합니다. 로그인 후 다시 시도해주세요.");
      return;
    }

    if (!effectiveProfileId) {
      setItems([]);
      setError("프로필 식별자를 확인할 수 없습니다.");
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
    if (needsLoginForMe) return;
    if (!effectiveProfileId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProfileId, needsLoginForMe]);

  const visibleItems = useMemo(() => {
    // 서버 응답에 scannedAt 같은 정렬키가 없어서, ticketId 기준 내림차순 정도로만 정렬
    return [...items].sort((a, b) => Number((b as any).ticketId ?? 0) - Number((a as any).ticketId ?? 0));
  }, [items]);

  // ✅ 상세는 ticketCode 기준 라우팅 (CollectBookDetail이 ticketCode로 찾음)
  const goDetail = (ticketCode: string) => {
    const code = String(ticketCode ?? "").trim();
    if (!code) return;

    const encoded = encodeURIComponent(code);

    if (!isLoggedIn) {
      nav("/login", { state: { from: `/lounge/collectbook/${encoded}` } });
      return;
    }
    if (viewerRole && viewerRole !== "general") {
      alert("콜렉트북 상세는 USER(General)만 접근 가능합니다.");
      return;
    }
    nav(`/lounge/collectbook/${encoded}`);
  };

  const goLogin = () => {
    nav("/login", { state: { from: `/profile/${rawProfileId}` } });
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h3 className="tab-title">Collection</h3>

        <div className="tab-controls">
          {needsLoginForMe ? (
            <button type="button" onClick={goLogin} className="tab-btn">
              Login
            </button>
          ) : (
            <button type="button" onClick={reload} className="tab-btn" disabled={busy}>
              {busy ? "Loading..." : "Reload"}
            </button>
          )}
        </div>
      </div>

      <div className="tab-desc">
        {isOwner ? (
          <>
            라운지에서 수집한 티켓이 이곳에 표시됩니다.{" "}
            <Link to="/lounge/collectbook">Go to CollectBook</Link>
          </>
        ) : (
          <>해당 사용자의 콜렉트북 티켓 목록입니다.</>
        )}
      </div>

      {error && <div className="tab-empty">{error}</div>}

      {!error && visibleItems.length === 0 ? (
        <div className="tab-empty">
          <div className="tab-empty-title">No Tickets Yet</div>
          <div>아직 등록한 티켓이 없습니다.</div>
        </div>
      ) : (
        <div className="tab-grid-2">
          {visibleItems.map((t) => {
            const code = String((t as any).ticketCode ?? "").trim(); // ✅ 응답에 ticketCode가 있다고 가정
            return (
              <button
                key={(t as any).ticketId ?? code}
                type="button"
                className="tab-card"
                onClick={() => goDetail(code)}
                style={{ textAlign: "left", cursor: "pointer" }}
                disabled={!code}
                title={!code ? "ticketCode가 없어 상세로 이동할 수 없습니다." : undefined}
              >
                <div className="tab-card-body">
                  <div className="tab-card-header">
                    <div className="tab-card-title">{t.title ?? "Untitled"}</div>
                  </div>

                  <div className="tab-card-info">
                    <div>📍 {t.address ?? "-"}</div>
                    <div>
                      📅 {t.startDate ?? "-"} ~ {t.endDate ?? "-"}
                    </div>
                    <div>
                      ⏰ {hhmm(t.startTime)} ~ {hhmm(t.endTime)}
                    </div>

                    {/* (선택) 디버깅/가시성용 ticketCode 표시 */}
                    {/* <div style={{ opacity: 0.7, marginTop: 6 }}>CODE: {code || "-"}</div> */}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
