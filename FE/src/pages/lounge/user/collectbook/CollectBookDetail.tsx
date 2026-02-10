// FE/src/pages/lounge/user/collectbook/CollectBookDetail.tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "../../lounge.css";

import TicketCardModern from "./TicketCardModern";
import "./ticketCardModern.css";

import { useAuthStore } from "../../../../features/auth/store";
import { apiCollectBookList } from "../../../../features/collectbook/api/real";
import type { CollectBookResponse } from "../../../../features/tickets/api/realTickets";
import { http } from "../../../../shared/api/http";
import { resolveMediaUrl } from "../../../../features/tickets/resolveTicketMedia";

function formatDateRange(start?: string, end?: string) {
  const s = start?.trim() || "-";
  const e = end?.trim() || "-";
  return `${s} – ${e}`;
}

function hhmm(t?: string) {
  if (!t) return "-";
  return String(t).slice(0, 5);
}

function formatKST(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/**
 * ✅ TicketCardModern(HeroImage)와 동일 패턴
 * - src 해석은 resolveMediaUrl()로만 통일 (우회 로직 제거)
 * - <img> 로드 실패 시: Authorization 포함 blob 재시도
 * - relative면 window.location.origin 붙여 "same-origin absolute"로 요청 (axios baseURL 영향 제거)
 */
function AuthedImage({
  src,
  alt,
  style,
}: {
  src?: string | null;
  alt: string;
  style?: CSSProperties;
}) {
  const resolved = useMemo(() => resolveMediaUrl(src ?? ""), [src]);

  const [displaySrc, setDisplaySrc] = useState<string>("");
  const [triedBlob, setTriedBlob] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setDisplaySrc(resolved);
    setTriedBlob(false);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [resolved]);

  if (!resolved || !displaySrc) return null;

  const requestUrl =
    /^https?:\/\//i.test(resolved)
      ? resolved
      : `${window.location.origin}${resolved.startsWith("/") ? "" : "/"}${resolved}`;

  return (
    <img
      src={displaySrc}
      alt={alt}
      style={style}
      onError={async () => {
        // 1) 일반 <img> 로드 실패 → 2) Authorization 포함 blob 시도 → 3) 실패면 숨김
        if (triedBlob) {
          setDisplaySrc("");
          return;
        }

        try {
          setTriedBlob(true);
          const res = await http.get(requestUrl, { responseType: "blob" }); // ✅ absolute라 baseURL 무시됨
          const objUrl = URL.createObjectURL(res.data);
          blobUrlRef.current = objUrl;
          setDisplaySrc(objUrl);
        } catch {
          setDisplaySrc("");
        }
      }}
    />
  );
}

const PROFILE_PATH = (artistUuid: string) => `/members/${artistUuid}`;

function pickLatestByCreatedAt(list: CollectBookResponse[]) {
  const copy = [...list];
  copy.sort((a, b) => {
    const ta = new Date((a as any)?.createdAt ?? 0).getTime();
    const tb = new Date((b as any)?.createdAt ?? 0).getTime();
    return tb - ta;
  });
  return copy[0] ?? null;
}

export default function CollectBookDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const ownerUuid = useAuthStore((s) => s.user?.memberUuid ?? "");
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const ticketCode = useMemo(() => {
    const raw = id ?? "";
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [id]);

  // ✅ 특정 등록건을 고르고 싶으면 ?at=createdAt(ISO)로 들어오게 함
  const at = useMemo(() => {
    const raw = searchParams.get("at");
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [item, setItem] = useState<CollectBookResponse | null>(null);

  useEffect(() => {
    if (!ticketCode) return;

    if (!isLoggedIn || !ownerUuid) {
      setError("로그인이 필요합니다.");
      setItem(null);
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setItem(null);

      try {
        const list = await apiCollectBookList(ownerUuid);
        if (!alive) return;

        const items = Array.isArray(list) ? list.filter((x) => x.ticketCode === ticketCode) : [];
        if (items.length === 0) {
          setItem(null);
          setError("해당 티켓을 찾을 수 없습니다. (ticketCode 불일치)");
          return;
        }

        // ✅ at가 있으면 그 createdAt을 우선 선택
        const byAt = at ? items.find((x) => String((x as any)?.createdAt ?? "") === at) : null;
        const picked = byAt ?? pickLatestByCreatedAt(items);

        setItem(picked);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "티켓 상세를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ticketCode, at, isLoggedIn, ownerUuid]);

  // ✅ 이미지 필드명/형태(Url vs Name) 흡수 + resolveMediaUrl()로만 최종 해석 통일
  const ticketImageSrc = useMemo(() => {
    if (!item) return "";
    const raw =
      (item as any)?.ticketImageUrl ??
      (item as any)?.ticketImageName ??
      (item as any)?.ticketImage ??
      "";
    return resolveMediaUrl(String(raw ?? ""));
  }, [item]);

  const qrImageSrc = useMemo(() => {
    if (!item) return "";
    const raw =
      (item as any)?.qrImageUrl ??
      (item as any)?.qrImageName ??
      (item as any)?.qrImage ??
      "";
    return resolveMediaUrl(String(raw ?? ""));
  }, [item]);

  if (!ticketCode) {
    return (
      <main className="loungePage">
        <section className="loungeWrap">
          <div className="loungeSubTop">
            <h1 className="loungeSubTitle">티켓 상세</h1>
            <Link className="loungeBackLink" to="/lounge/collectbook">
              ← 컬렉트북으로
            </Link>
          </div>

          <div className="loungeSubPanel">
            <p className="loungeSubHint">잘못된 접근입니다. (ticketCode 없음)</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">티켓 상세</h1>
          <Link className="loungeBackLink" to="/lounge/collectbook">
            ← 컬렉트북으로
          </Link>
        </div>

        {loading ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">{error}</p>
          </div>
        ) : !item ? (
          <div className="loungeSubPanel">
            <p className="loungeSubHint">해당 티켓을 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {/* ✅ 티켓 이미지 먼저 */}
            <div className="loungeSubPanel">
              <h2 className="loungeSubPanelTitle" style={{ marginBottom: 10 }}>
                티켓 이미지
              </h2>
              {ticketImageSrc ? (
                <AuthedImage
                  src={ticketImageSrc}
                  alt="ticket"
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    display: "block",
                  }}
                />
              ) : (
                <p className="loungeSubHint">티켓 이미지가 제공되지 않았습니다.</p>
              )}
            </div>
            {/* ✅ 상세 정보 */}
            <div className="loungeSubPanel">
              <p className="loungeSubHint" style={{ lineHeight: 1.75 }}>
                <strong>전시명</strong>: {item.title}
                <br />
                <strong>장소</strong>: {item.address} {item.addressDetail ? `(${item.addressDetail})` : ""}
                <br />
                <strong>기간</strong>: {item.startDate} ~ {item.endDate}
                <br />
                <strong>운영시간</strong>: {hhmm(item.startTime)} ~ {hhmm(item.endTime)}
                <br />
                <strong>랭크</strong>: {(item as any).collectRank}
                <br />
                <strong>등록일</strong>: {formatKST((item as any).createdAt)}
                <br />
                <strong>아티스트</strong>:{" "}
                <Link to={PROFILE_PATH((item as any).artistUuid)} style={{ textDecoration: "underline" }}>
                  프로필로 이동
                </Link>
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
