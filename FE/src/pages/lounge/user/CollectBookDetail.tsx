import { Link, useParams } from "react-router-dom";
import "../lounge.css";

import { getCollectBookItem } from "../../../utils/collectbookStorage";

export default function CollectBookDetail() {
  const { id } = useParams<{ id: string }>();
  const item = id ? getCollectBookItem(id) : null;

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <div className="loungeSubTop">
          <h1 className="loungeSubTitle">티켓 상세</h1>
          <Link className="loungeBackLink" to="/lounge/collectbook">
            ← 목록으로
          </Link>
        </div>

        <div className="loungeSubPanel">
          {!item ? (
            <div className="loungeNotice">
              티켓을 찾지 못했습니다. 목록으로 돌아가 다시 선택하세요.
            </div>
          ) : (
            <>
              <div className="loungeSubPanelTitle">{item.exhibition?.title ?? "전시 정보 없음"}</div>

              <p className="loungeSubHint" style={{ marginTop: 10 }}>
                <strong>장소</strong>: {item.exhibition?.place ?? "-"}
                <br />
                <strong>기간</strong>: {item.exhibition?.startDate ?? "-"} ~ {item.exhibition?.endDate ?? "-"}
                <br />
                <strong>관람일</strong>: {item.visitedAt}
                <br />
                <strong>공개</strong>: {item.visibility === "public" ? "공개" : "비공개"}
                <br />
                <strong>스캔</strong>: {new Date(item.scannedAt).toLocaleString()}
                <br />
                <strong>ticket_code</strong>: {item.ticketCode}
              </p>

              {item.exhibition?.posterUrl && (
                <div style={{ marginTop: 12 }}>
                  <img
                    src={item.exhibition.posterUrl}
                    alt="poster"
                    style={{
                      width: "100%",
                      maxWidth: 520,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  />
                </div>
              )}

              {item.memo ? (
                <div style={{ marginTop: 12 }}>
                  <div className="loungeSubHint">메모</div>
                  <div
                    style={{
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {item.memo}
                  </div>
                </div>
              ) : null}

              <div className="loungeSubActions" style={{ marginTop: 14 }}>
                <Link className="loungeSubBtn" to="/lounge/collectbook">
                  목록으로
                </Link>
                <Link className="loungeSubBtn" to="/lounge/collectbook/scan">
                  다시 스캔
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
