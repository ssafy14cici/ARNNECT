// FE/src/features/auth/types.ts

export type UserRole = "general" | "artist"; // FE 표준(라우터 guard와도 맞춤)

export type LoginRequest = {
  email: string;
  password: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  email: string;
  role: UserRole;
  memberUuid: string;
  name: string;
};

// ✅ 유저 회원가입(백엔드 DTO가 다르면 여기만 바꾸면 됨)
export type SignupUserRequest = {
  name: string;
  email: string;
  password: string;
  phone: string;      // 숫자만 권장
  birth: string;      // "yyyy-MM-dd"
  nickname: string;
  isAgree: boolean;
  image?: File | null; // ✅ BE MultipartFile image 대응(옵션)
};


// ✅ 예술인 회원가입(POST /member/artist/signup)
export type SignupArtistRequest = {
  email: string;
  password: string;
  name: string;
  nickname: string;
  phone: string;
  birth: string; // "YYYY-MM-DD"
  role: UserRole; // artist 권장 (Postman은 general로 찍혀있는데, 이건 백엔드랑 한 번 확인 권장)
  isAgree: boolean;

  // ⚠️ document가 실제로 파일 업로드면 multipart로 갈 가능성 높음
  // - 지금은 Postman에 "file" 문자열로만 찍혀있어, 일단 string | File 둘 다 수용
  document?: string | File | null;

  fieldId: number;
  debutYear: number;
  genreId: number;

  sns?: string;
  affiliation?: string;
  artIntroduction?: string;
};

// ✅ 이메일 중복체크(화면에서 쓰기 좋은 형태)
export type EmailDupCheckResult = {
  ok: boolean;
  message: string;
};
