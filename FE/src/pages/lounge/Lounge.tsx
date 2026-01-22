// FE/src/pages/lounge/Lounge.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import "./lounge.css";

import { useAuthStore } from "../../stores/authStore";
import type { Role } from "../../router/guards";

type LoungeAction = {
  key: string;
  title: string;
  desc: string;
  to: string; // 추후 서브 라우트 연결용
  disabled?: boolean;
};

function getRoleLabel(role?: Role) {
  if (!role) return "UNKNOWN";
  return role === "artist" ? "ARTIST" : "general";
}

function isArtist(role?: Role) {
  return role === "artist";
}

export default function Lounge() {
  const { isLoggedIn, role } = useAuthStore();

  const roleLabel = useMemo(() => getRoleLabel(role), [role]);

  const actions: LoungeAction[] = useMemo(() => {
    // 로그인/역할이 확정되지 않은 경우에도 UI는 뜨되, 액션은 잠시 비활성 처리
    const baseDisabled = !isLoggedIn || !role;

    if (isArtist(role)) {
      return [
        {
          key: "qr",
          title: "QR 티켓 발급",
          desc: "관람객 스캔용 티켓 코드/QR 생성",
          to: "/lounge/qr",
          disabled: baseDisabled,
        },
        {
          key: "portfolio",
          title: "포트폴리오",
          desc: "내 작품/작업물 관리",
          to: "/lounge/portfolio",
          disabled: baseDisabled,
        },
        {
          key: "fanletter",
          title: "팬레터 · QnA",
          desc: "질문/답변 및 소통 관리",
          to: "/lounge/fanletter",
          disabled: baseDisabled,
        },
      ];
    }

    // USER (일반유저)
    return [
      {
        key: "collectbook",
        title: "컬렉트북",
        desc: "스캔한 티켓/작품 기록",
        to: "/lounge/collectbook",
        disabled: baseDisabled,
      },
      {
        key: "taste",
        title: "취향분석",
        desc: "나의 선호/활동 기반 요약",
        to: "/lounge/taste",
        disabled: baseDisabled,
      },
      {
        key: "quiz",
        title: "퀴즈",
        desc: "작품/작가 기반 퀴즈",
        to: "/lounge/quiz",
        disabled: baseDisabled,
      },
    ];
  }, [isLoggedIn, role]);

  return (
    <main className="loungePage">
      <section className="loungeWrap">
        <header className="loungeHeader">
          <div className="loungeHeaderTop">
            <h1 className="loungeTitle">Lounge</h1>
            <span className={`loungeRoleBadge ${roleLabel.toLowerCase()}`}>
              {roleLabel}
            </span>
          </div>

          <p className="loungeSubtitle">
            내 활동/내 기능 허브 (Role Split)
          </p>

          {!isLoggedIn && (
            <div className="loungeNotice">
              로그인이 필요합니다. (현재는 UI만 노출)
            </div>
          )}

          {isLoggedIn && !role && (
            <div className="loungeNotice">
              역할(Role)이 아직 확정되지 않았습니다. 스토어/Mock 데이터 확인 필요
            </div>
          )}
        </header>

        <section className="loungeSection">
          <h2 className="loungeSectionTitle">Quick Actions</h2>

          <div className="loungeGrid">
            {actions.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className={`loungeCard ${a.disabled ? "disabled" : ""}`}
                onClick={(e) => {
                  if (a.disabled) e.preventDefault();
                }}
                aria-disabled={a.disabled || undefined}
              >
                <div className="loungeCardBody">
                  <div className="loungeCardTitleRow">
                    <h3 className="loungeCardTitle">{a.title}</h3>
                    <span className="loungeChevron" aria-hidden="true">
                      →
                    </span>
                  </div>
                  <p className="loungeCardDesc">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="loungeSection">
          <h2 className="loungeSectionTitle">My Activity</h2>
          <div className="loungePanel">
            <p className="loungePanelText">
              최근 활동(업로드/댓글/좋아요/스캔/답변 등) 영역 — 추후 API 연동 시 타임라인으로 확장
            </p>
            <div className="loungeEmpty">
              아직 표시할 데이터가 없습니다.
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
