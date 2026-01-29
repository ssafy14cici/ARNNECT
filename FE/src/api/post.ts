import axios from "axios"; // 프로젝트 설정에 맞게 axios 인스턴스 import

// 실제 프로젝트의 axios 인스턴스 경로로 수정하세요 (예: ../lib/axios)
const client = axios.create({ baseURL: "YOUR_API_BASE_URL" }); 

// --- Types ---
export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  imageUrl: string;
  tags: string[];
}

export interface ArtworkCreateReq {
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  imageUrl: string;
  tags: string[];
}

// --- API Functions ---

// 1. 이미지 업로드 (명세가 없으므로 목업 처리)
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  // TODO: 실제 이미지 업로드 API 엔드포인트로 교체 필요
  // const res = await client.post("/files/upload", formData, {
  //   headers: { "Content-Type": "multipart/form-data" },
  // });
  // return res.data.url;

  // 임시: 로컬 URL 반환 (프리뷰용)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(URL.createObjectURL(file)); 
    }, 500);
  });
};

// 2. 감상평 등록
export const createReview = async (data: ReviewCreateReq) => {
  // const res = await client.post("/reviews", data);
  // return res.data;
  console.log("[API] createReview:", data);
  return { success: true };
};

// 3. 작품 등록
export const createArtwork = async (data: ArtworkCreateReq) => {
  // const res = await client.post("/artworks", data);
  // return res.data;
  console.log("[API] createArtwork:", data);
  return { success: true };
};