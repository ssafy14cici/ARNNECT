import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePreferenceStore } from "./preferenceStore";
import "./yourpreference.css";

type RoundOption = { id: string; src: string; type: string };
type Round = { id: number; question: string; left: RoundOption; right: RoundOption };

const ROUNDS: Round[] = [
  {
    id: 1,
    question: "Round 1/4",
    left: {
      id: "A1",
      src: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=800&q=80",
      type: "Abstract",
    },
    right: {
      id: "B1",
      src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
      type: "Classic",
    },
  },
  {
    id: 2,
    question: "Round 2/4",
    left: {
      id: "A2",
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      type: "Vivid",
    },
    right: {
      id: "B2",
      src: "https://images.unsplash.com/photo-1507643179173-617d654f3daf?auto=format&fit=crop&w=800&q=80",
      type: "Mono",
    },
  },
  {
    id: 3,
    question: "Round 3/4",
    left: {
      id: "A3",
      src: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=800&q=80",
      type: "Warm",
    },
    right: {
      id: "B3",
      src: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
      type: "Cold",
    },
  },
  {
    id: 4,
    question: "Round 4/4",
    left: {
      id: "A4",
      src: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
      type: "Minimal",
    },
    right: {
      id: "B4",
      src: "https://images.unsplash.com/photo-1582560475093-6f498e642f37?auto=format&fit=crop&w=800&q=80",
      type: "Complex",
    },
  },
];

export default function YourPreferenceSelect() {
  const navigate = useNavigate();

  const currentRoundIdx = usePreferenceStore((s) => s.currentRoundIdx);
  const setRoundIdx = usePreferenceStore((s) => s.setRoundIdx);
  const addSelection = usePreferenceStore((s) => s.addSelection);

  const round = useMemo(() => ROUNDS[currentRoundIdx], [currentRoundIdx]);

  // 잘못 진입(인덱스 범위 밖) → /preference로
  if (!round) {
    navigate("/preference", { replace: true });
    return null;
  }

  const handleSelect = (choice: { id: string; type: string }) => {
    addSelection({
      round: currentRoundIdx + 1,
      selectedId: choice.id,
      type: choice.type,
    });

    if (currentRoundIdx < ROUNDS.length - 1) {
      window.setTimeout(() => setRoundIdx(currentRoundIdx + 1), 250);
    } else {
      navigate("/preference/result");
    }
  };

  return (
    <div className="pref-page">
      <div className="pref-container">
        <div className="pref-battle fade-in">
          <div className="battle-header">
            <span className="battle-round">ROUND {currentRoundIdx + 1} / 4</span>
            <h2 className="battle-title">어느 쪽이 더 끌리나요?</h2>
          </div>

          <div className="battle-arena">
            <div className="battle-card" onClick={() => handleSelect(round.left)}>
              <img src={round.left.src} alt="Left Option" />
              <div className="battle-overlay">SELECT</div>
            </div>

            <div className="battle-vs">VS</div>

            <div className="battle-card" onClick={() => handleSelect(round.right)}>
              <img src={round.right.src} alt="Right Option" />
              <div className="battle-overlay">SELECT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
