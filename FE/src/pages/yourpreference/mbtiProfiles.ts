export type MbtiProfile = {
  title: string;
  tagline: string;
  description: string;
  strengths: readonly string[];
  watchouts: readonly string[];
  tip: string;
};

export const MBTI_PROFILES = {
  ANLS: {
    title: "신화 설계자",
    tagline: "개념으로 서사를 짜고, 선으로 상징을 박제한다.",
    description:
      "보이는 것보다 의미의 구조를 먼저 잡는다.\n한 획 한 획이 메시지의 뼈대가 되는 타입.",
    strengths: ["세계관 구축", "구조적 구성", "강한 상징성"],
    watchouts: ["난해해 보일 수 있음", "감정 온도 낮아질 수 있음"],
    tip: "이 장면에서 관객이 딱 한 문장만 가져가게 하자.",
  },
  ANLE: {
    title: "아이디어 지도 제작자",
    tagline: "의미를 선으로 정리해, 일상에 정확히 꽂아 넣는다.",
    description:
      "복잡한 생각을 정돈된 형태로 번역한다.\n현실의 소재도 ‘컨셉’으로 재배치하는 편.",
    strengths: ["정리력", "구성력", "명료한 메시지 전달"],
    watchouts: ["너무 깔끔해서 재미가 덜할 수 있음"],
    tip: '일부러 한 군데는 "흔들림"을 남겨서 숨을 주기.',
  },
  ANCS: {
    title: "컬러 신화 연금술사",
    tagline: "색으로 세계관을 끓이고, 상징으로 관객을 납치한다.",
    description:
      "색이 감정이 아니라 서사의 장치다.\n한 팔레트로 분위기 + 의미를 동시에 띄운다.",
    strengths: ["강렬한 인상", "상징적 컬러링", "몰입감"],
    watchouts: ['과해지면 "의미 과잉" 느낌'],
    tip: "상징은 3개까지만. 나머지는 색이 말하게 두기.",
  },
  ANCE: {
    title: "팝 컨셉 디렉터",
    tagline: "아이디어를 감각으로 포장해, 일상에 바이럴을 건다.",
    description:
      '관객이 바로 "이게 뭐지?" 하고 멈춰 서게 만든다.\n컨셉을 읽기 쉬운 이미지로 치환하는 능력이 핵심.',
    strengths: ["접근성", "확산력", "캐치한 비주얼"],
    watchouts: ["가벼워 보일 수 있음"],
    tip: '"한 줄 설명"을 먼저 만들고 그걸 이미지로 번역하기.',
  },

  AMLS: {
    title: "의식(儀式) 디자이너",
    tagline: "분위기로 예열하고, 선으로 주문을 걸어 상징을 남긴다.",
    description:
      "말보다 공기를 만든다.\n조용한 화면인데도 계속 시선이 붙잡히는 타입.",
    strengths: ["미묘한 긴장감", "무드 연출", "상징의 여운"],
    watchouts: ['설명이 부족하면 "의도 모름"으로 끝날 수 있음'],
    tip: "제목/캡션에 힌트 한 단어만 넣어도 완성도가 확 올라감.",
  },
  AMLE: {
    title: "미니멀 무드 큐레이터",
    tagline: "덜어낼수록 선명해지는 감각, 일상에서 빛난다.",
    description:
      "과잉 대신 여백으로 승부한다.\n정돈된 선과 톤으로 감정을 깔끔하게 전달.",
    strengths: ["절제미", "완성도", "공간감"],
    watchouts: ["심심해 보일 수 있음"],
    tip: '포인트는 1개만 크게. "작게 여러 개"는 금지.',
  },
  AMCS: {
    title: "감각 신전 건축가",
    tagline: "색으로 분위기를 세우고, 상징으로 끝에 못을 박는다.",
    description:
      "작품이 하나의 공간/의식처럼 느껴진다.\n감정의 파동을 상징으로 수렴시키는 타입.",
    strengths: ["압도적 분위기", "상징적 몰입", "컬러 연출"],
    watchouts: ["무드가 너무 진하면 피로감"],
    tip: '"숨구멍"으로 밝은 톤/빈 공간을 한 군데 열어두기.',
  },
  AMCE: {
    title: "무드 포스터리스트",
    tagline: "감정은 색으로, 임팩트는 일상 소재로 한 방에.",
    description:
      '관객의 감정을 먼저 낚고, 의미는 뒤늦게 따라온다.\n"갖고 싶게 만드는 이미지"를 잘 만든다.',
    strengths: ["즉발 임팩트", "대중성", "감각적인 톤"],
    watchouts: ["깊이가 얕게 느껴질 수 있음"],
    tip: "메시지는 하나만. 대신 디테일(텍스처/노이즈)로 레이어 쌓기.",
  },

  RNLS: {
    title: "초상 서사 장인",
    tagline: "현실을 정확히 붙잡아, 그 안에 상징을 숨긴다.",
    description:
      "디테일이 곧 이야기다.\n인물/형태를 통해 서사와 상징을 동시에 전달.",
    strengths: ["디테일", "캐릭터성", "상징적 연출"],
    watchouts: ["너무 설명적이면 교과서처럼 보일 수 있음"],
    tip: '상징은 "노골적"보다 "발견되는 것"이 더 강함.',
  },
  RNLE: {
    title: "관찰 기록자",
    tagline: "선으로 사실을 기록하고, 이야기를 일상에서 뽑아낸다.",
    description:
      "꾸미기보다 있는 그대로의 힘을 믿는다.\n차분하지만 오래 보게 만드는 타입.",
    strengths: ["신뢰감", "관찰력", "이야기의 현실성"],
    watchouts: ["밋밋하다는 소리 들을 수 있음"],
    tip: '“단 하나의 과장”을 넣어 장면의 포인트 만들기(각도/크기/여백).',
  },
  RNCS: {
    title: "드라마틱 아이콘메이커",
    tagline: "사실을 바탕으로 색을 터뜨려, 상징을 영웅으로 만든다.",
    description:
      "현실을 출발점으로 삼되, 결과는 아이콘이다.\n강한 대비와 컬러로 서사를 뚜렷하게 만든다.",
    strengths: ["임팩트", "상징 강화", "이야기 전달력"],
    watchouts: ["과장 과하면 촌스러울 수 있음"],
    tip: "색은 2~3개만 주연으로 두고 나머지는 조연으로 눌러주기.",
  },
  RNCE: {
    title: "일상 시네마토그래퍼",
    tagline: "색으로 장면을 살리고, 일상의 순간을 이야기로 만든다.",
    description:
      '평범한 소재를 "한 장면"으로 바꾼다.\n감정선이 자연스럽게 흘러서 관객이 편하게 빠진다.',
    strengths: ["공감력", "장면 연출", "컬러 톤 조절"],
    watchouts: ["너무 예쁘기만 하면 기억에 덜 남음"],
    tip: '한 컷에 "불편한 디테일" 하나만 넣어 서사 스위치 켜기.',
  },

  RMLS: {
    title: "정적의 상징가",
    tagline: "현실을 조용히 눌러 담아, 선으로 상징의 침묵을 만든다.",
    description:
      "화려함 대신 정적의 밀도로 승부한다.\n보는 사람이 스스로 의미를 꺼내게 한다.",
    strengths: ["깊은 여운", "절제된 상징", "집중력"],
    watchouts: ["거리감/차가움으로 읽힐 수 있음"],
    tip: '제목에 감정 단어 하나만 넣어도 해석이 열린다(예: "기다림", "불안").',
  },
  RMLE: {
    title: "선으로 숨 쉬는 관찰자",
    tagline: "분위기는 담백하게, 일상은 정확하게—선이 다 말한다.",
    description:
      "화면이 깔끔한데 감정이 새어 나온다.\n디테일보다 형태의 리듬을 믿는 타입.",
    strengths: ["안정감", "시선 흐름 설계", "조용한 몰입"],
    watchouts: ["임팩트 부족 평가 받을 수 있음"],
    tip: '시선이 멈추는 지점(포컬 포인트)을 의도적으로 "한 점" 만들기.',
  },
  RMCS: {
    title: "빛의 성소 화가",
    tagline: "현실의 질감 위에 색을 얹어, 상징으로 봉인한다.",
    description:
      "색이 장식이 아니라 빛과 기도처럼 작동한다.\n무드가 깊고 상징이 단단하다.",
    strengths: ["질감+무드", "상징적 깊이", "컬러 감도"],
    watchouts: ["지나치게 무거워질 수 있음"],
    tip: '"밝은 색 한 방울"이 전체를 살린다. 진짜로.',
  },
  RMCE: {
    title: "풍경의 체온 조절사",
    tagline: "현실의 순간을 색으로 데워, 일상에 감정 온도를 남긴다.",
    description:
      '관객이 "내가 있던 곳 같다"는 느낌부터 받는다.\n익숙한 장면에 감정의 색을 깔아준다.',
    strengths: ["편안한 몰입", "감정 전달", "색의 온도감"],
    watchouts: ["안전한 선택만 하면 평범해질 수 있음"],
    tip: '일상 소재를 하나만 "낯설게" 처리하기(광원/그림자/색온도).',
  },
} as const;

export type MbtiCode = keyof typeof MBTI_PROFILES;

export function resolveMbtiProfile(code: string) {
  const key = String(code || "").trim().toUpperCase();
  return (MBTI_PROFILES as Record<string, MbtiProfile | undefined>)[key] ?? null;
}
