// FE/src/components/badge/BadgeSection.tsx

import { useMemo, useState } from "react";
import { BADGES } from "../../../shared/config/badges";
import { useBadgeStore } from "../store";
import type { BadgeStats } from "../types";
import { computeEarnedBadgeIds } from "../rules";
import BadgeChip from "./BadgeChip";
import BadgePicker from "./BadgePicker";
import "./badge.css";

export default function BadgeSection({ stats }: { stats: BadgeStats }) {
  console.log("BadgeSection stats:", stats);
  const [open, setOpen] = useState(false);
  const { featured } = useBadgeStore();

  const earnedIds = useMemo(() => computeEarnedBadgeIds(stats), [stats]);
  const featuredBadges = useMemo(
    () => BADGES.filter((b) => featured.includes(b.id)),
    [featured],
  );
  const earnedBadges = useMemo(
    () => BADGES.filter((b) => earnedIds.includes(b.id)),
    [earnedIds],
  );

  return (
    <section className="badge-container">
      {/* Header */}
      <div className="badge-header">
        <div>
          <h2 className="badge-title">Collection</h2>
          <p className="badge-desc">당신의 활동이 증명된 훈장들입니다.</p>
        </div>
        <button
          type="button"
          className="badge-edit-btn"
          onClick={() => setOpen(true)}
        >
          편집하기
        </button>
      </div>

      {/* 1. Featured Badges (Showcase) */}
      <div className="badge-showcase">
        <div className="badge-label">REPRESENTATIVE</div>

        {featuredBadges.length === 0 ? (
          <div className="badge-empty-box">
            <span>대표 뱃지를 선택하여 프로필을 꾸며보세요.</span>
          </div>
        ) : (
          <div className="badge-featured-row">
            {featuredBadges.map((b) => (
              // BadgeChip에 size props 등을 추가해서 크게 보여줄 수도 있음
              <div key={b.id} className="badge-wrapper featured">
                <BadgeChip badge={b} selected />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. All Earned Badges (Grid) */}
      <div className="badge-list-section">
        <div className="badge-label">ARCHIVE ({earnedBadges.length})</div>

        {earnedBadges.length === 0 ? (
          <div className="badge-empty-text">아직 획득한 뱃지가 없습니다.</div>
        ) : (
          <div className="badge-grid">
            {earnedBadges.map((b) => (
              <BadgeChip key={b.id} badge={b} />
            ))}
          </div>
        )}
      </div>

      <BadgePicker
        open={open}
        onClose={() => setOpen(false)}
        earnedIds={earnedIds}
      />
    </section>
  );
}
