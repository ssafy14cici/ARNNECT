import { useMemo, useState } from "react";
import { BADGES } from "../../data/badges";
import { useBadgeStore } from "../../stores/badgeStore";
import type { BadgeStats } from "../../types/badge";
import { computeEarnedBadgeIds } from "../../utils/badgeRules";
import BadgeChip from "./BadgeChip";
import BadgePicker from "./BadgePicker";
import "./badge.css";

export default function BadgeSection({ stats }: { stats: BadgeStats }) {
  const [open, setOpen] = useState(false);
  const { featured } = useBadgeStore();

  const earnedIds = useMemo(() => computeEarnedBadgeIds(stats), [stats]);
  const featuredBadges = useMemo(() => BADGES.filter((b) => featured.includes(b.id)), [featured]);
  const earnedBadges = useMemo(() => BADGES.filter((b) => earnedIds.includes(b.id)), [earnedIds]);

  return (
    <section className="badgeSection">
      <div className="badgeSectionHeader">
        <h2 className="badgeSectionTitle">뱃지</h2>
        <button type="button" className="badgeEdit" onClick={() => setOpen(true)}>
          대표 뱃지 선택
        </button>
      </div>

      <div className="badgeSubTitle">대표 뱃지</div>
      {featuredBadges.length === 0 ? (
        <div className="badgeEmpty">대표 뱃지를 선택해보세요 (최대 3개)</div>
      ) : (
        <div className="badgeRow">
          {featuredBadges.map((b) => (
            <BadgeChip key={b.id} badge={b} selected />
          ))}
        </div>
      )}

      <div className="badgeSubTitle">획득한 뱃지</div>
      {earnedBadges.length === 0 ? (
        <div className="badgeEmpty">아직 획득한 뱃지가 없어요.</div>
      ) : (
        <div className="badgeGrid">
          {earnedBadges.map((b) => (
            <BadgeChip key={b.id} badge={b} />
          ))}
        </div>
      )}

      <BadgePicker open={open} onClose={() => setOpen(false)} earnedIds={earnedIds} />
    </section>
  );
}
