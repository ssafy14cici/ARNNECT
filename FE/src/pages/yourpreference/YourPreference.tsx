import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store"; // 경로 확인 필요
import "./yourpreference.css";

// --- Mock Data (실제로는 API로 받아올 신진 작가 작품 쌍) ---
const ROUNDS = [
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

// --- Types ---
type Step = "INTRO" | "BATTLE" | "ANALYZING" | "RESULT";
type Selection = { round: number; selectedId: string; type: string };

export default function YourPreference() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();

  const [step, setStep] = useState<Step>("INTRO");
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selections, setSelections] = useState<Selection[]>([]);

  // AI 결과 시뮬레이션용 상태
  const [resultData, setResultData] = useState<any>(null);

  // 비회원 제한 체크
  const checkLimit = () => {
    if (isLoggedIn) return true;
    const hasPlayed = localStorage.getItem("guest_pref_played");
    if (hasPlayed) return false;
    return true;
  };

  const startTest = () => {
    if (!checkLimit()) {
      if (
        confirm(
          "비회원은 한 번만 참여할 수 있습니다.\n회원가입 후 무제한으로 즐겨보세요!",
        )
      ) {
        navigate("/signup");
      }
      return;
    }
    setStep("BATTLE");
  };

  const handleSelect = (choice: { id: string; type: string }) => {
    const newSelections = [
      ...selections,
      { round: currentRoundIdx + 1, selectedId: choice.id, type: choice.type },
    ];
    setSelections(newSelections);

    if (currentRoundIdx < ROUNDS.length - 1) {
      // 다음 라운드 (약간의 딜레이로 클릭감 부여)
      setTimeout(() => setCurrentRoundIdx((prev) => prev + 1), 300);
    } else {
      // 종료 -> 분석
      finishTest(newSelections);
    }
  };

  const finishTest = (finalSelections: Selection[]) => {
    setStep("ANALYZING");

    // 비회원 사용 처리
    if (!isLoggedIn) {
      localStorage.setItem("guest_pref_played", "true");
    }

    // AI 분석 시뮬레이션 (3초 딜레이)
    setTimeout(() => {
      // TODO: 여기서 백엔드 API로 finalSelections 전송 -> 결과 수신
      // 지금은 Mock 결과 생성
      setResultData({
        mbti: "V.A.S.T",
        title: "몽환적인 밤의 탐험가",
        desc: "당신은 현실보다는 추상적인 감정과 깊은 색채에 끌리는 유형입니다. 정해진 형체보다는 흐르는듯한 붓터치에서 안정을 느낍니다.",
        keywords: ["#추상", "#딥블루", "#텍스처", "#이모셔널"],
        recommendArtist: "신진작가 김루멘",
      });
      setStep("RESULT");
    }, 3000);
  };

  // 다시 하기
  const retry = () => {
    if (!checkLimit()) {
      if (
        confirm(
          "더 많은 취향 분석을 원하시나요?\n회원가입하고 나만의 컬렉션을 완성하세요.",
        )
      ) {
        navigate("/signup");
      }
      return;
    }
    setCurrentRoundIdx(0);
    setSelections([]);
    setStep("BATTLE");
  };

  // --- Views ---

  const IntroView = (
    <div className="pref-intro fade-in">
      <h1 className="pref-title">
        Find Your <br />
        <span className="gold-text">Art Persona</span>
      </h1>
      <p className="pref-desc">
        이름도, 장르도 모른 채 오직 <strong>그림</strong>만으로 선택하세요.
        <br />
        Lumen AI가 당신의 무의식 속 예술 취향을 찾아드립니다.
      </p>
      <div className="pref-badges">
        <span>#블라인드테스트</span>
        <span>#신진작가발굴</span>
        <span>#AI분석</span>
      </div>
      <button className="pref-btn-start" onClick={startTest}>
        취향 분석 시작하기
      </button>
      {!isLoggedIn && (
        <p className="pref-limit-notice">* 비회원은 1회만 가능합니다.</p>
      )}
    </div>
  );

  const BattleView = (
    <div className="pref-battle fade-in">
      <div className="battle-header">
        <span className="battle-round">ROUND {currentRoundIdx + 1} / 4</span>
        <h2 className="battle-title">어느 쪽이 더 끌리나요?</h2>
      </div>

      <div className="battle-arena">
        {/* Left Card */}
        <div
          className="battle-card"
          onClick={() => handleSelect(ROUNDS[currentRoundIdx].left)}
        >
          <img src={ROUNDS[currentRoundIdx].left.src} alt="Left Option" />
          <div className="battle-overlay">SELECT</div>
        </div>

        {/* VS Badge */}
        <div className="battle-vs">VS</div>

        {/* Right Card */}
        <div
          className="battle-card"
          onClick={() => handleSelect(ROUNDS[currentRoundIdx].right)}
        >
          <img src={ROUNDS[currentRoundIdx].right.src} alt="Right Option" />
          <div className="battle-overlay">SELECT</div>
        </div>
      </div>
    </div>
  );

  const AnalyzingView = (
    <div className="pref-analyzing fade-in">
      <div className="analyzing-loader">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      <h2 className="analyzing-text">
        AI가 당신의 선택을 분석하고 있습니다...
      </h2>
      <p className="analyzing-sub">
        패턴 인식 중 • 예술 성향 도출 중 • 추천 작가 매칭 중
      </p>
    </div>
  );

  const ResultView = (
    <div className="pref-result fade-in">
      <div className="result-card">
        <div className="result-header">YOUR ART MBTI</div>
        <h1 className="result-type gold-text">{resultData?.mbti}</h1>
        <h2 className="result-title">{resultData?.title}</h2>
        <p className="result-desc">{resultData?.desc}</p>

        <div className="result-keywords">
          {resultData?.keywords.map((k: string) => (
            <span key={k}>{k}</span>
          ))}
        </div>

        <div className="result-recommend">
          <p>당신에게 추천하는 신진 예술가</p>
          <strong>{resultData?.recommendArtist}</strong>
        </div>
      </div>

      <div className="result-actions">
        <button className="pref-btn-secondary" onClick={retry}>
          다시 하기
        </button>
        {!isLoggedIn && (
          <Link to="/signup" className="pref-btn-primary">
            회원가입하고 결과 저장하기
          </Link>
        )}
        {isLoggedIn && (
          <Link to="/lounge/taste" className="pref-btn-primary">
            내 취향 라운지로 이동
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="pref-page">
      <div className="pref-container">
        {step === "INTRO" && IntroView}
        {step === "BATTLE" && BattleView}
        {step === "ANALYZING" && AnalyzingView}
        {step === "RESULT" && ResultView}
      </div>
    </div>
  );
}
